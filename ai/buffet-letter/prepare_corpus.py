"""Build a source-traceable corpus and a portable Chroma-backed vector index."""
from pathlib import Path
import argparse, hashlib, json, re, time
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
WORK = ROOT / 'work'
DIST = ROOT / 'dist'
BASE = 'https://www.berkshirehathaway.com/letters/'
MODEL_ID = 'Xenova/all-MiniLM-L6-v2'
MODEL_DIR = DIST / 'models' / MODEL_ID
SESSION = requests.Session()
SESSION.headers['User-Agent'] = 'Personal shareholder-letter research (cached downloads)'
SESSION.headers['Accept-Encoding'] = 'identity'

def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.partial')
    temp.write_bytes(data)
    temp.replace(path)

def fetch(url):
    for attempt in range(3):
        try:
            response = SESSION.get(url, timeout=(20, 90))
            response.raise_for_status()
            return response.content
        except requests.RequestException:
            if attempt == 2: raise
            time.sleep(2 * (attempt + 1))

def letter_urls():
    index = BeautifulSoup(fetch(BASE + 'letters.html'), 'html.parser')
    links = {}
    for anchor in index.find_all('a', href=True):
        match = re.search(r'(?:19|20)\d{2}', anchor['href'])
        if match:
            year = int(match.group())
            if 1977 <= year <= 2025:
                links[year] = urljoin(BASE, anchor['href'])
    # The older index uses HTML selectors. These official PDFs contain the letters.
    overrides = {1998:'1998pdf.pdf',1999:'final1999pdf.pdf',2000:'2000pdf.pdf',
                 2001:'2001pdf.pdf',2002:'2002pdf.pdf',2003:'2003ltr.pdf',2025:'2025ltr.pdf'}
    links.update({year:BASE+f'{year}ltr.pdf' for year in range(2004,2026)})
    links.update({year:BASE+name for year,name in overrides.items()})
    return links

def normalize(text):
    text = text.replace('\u00ad','').replace('\x00','')
    text = re.sub(r'(\w)-\n(\w)',r'\1\2',text)
    return re.sub(r'\s+',' ',text).strip()

def download_corpus():
    paths = WORK / 'letters'
    urls = letter_urls()
    chunks, documents, failures = [], [], []
    for year in range(1977, 2026):
        url = urls.get(year, BASE + f'{year}.html')
        suffix = '.pdf' if url.lower().endswith('.pdf') else '.html'
        path = paths / f'{year}{suffix}'
        try:
            if not path.exists():
                atomic(path,fetch(url));time.sleep(1)
            raw=path.read_bytes()
            if suffix=='.pdf':
                if not raw.startswith(b'%PDF'): raise ValueError('Expected a PDF document')
                pages=[p.extract_text() or '' for p in PdfReader(path).pages]
            else:
                if not raw.lstrip().startswith(b'<'):
                    import brotli
                    raw=brotli.decompress(raw)
                    if not raw.lstrip().startswith(b'<'):raise ValueError('Response is not HTML')
                    atomic(path,raw)
                soup=BeautifulSoup(raw,'html.parser')
                for tag in soup(['script','style','nav']):tag.decompose()
                pages=[soup.get_text(' ',strip=True)]
            word_count=sum(len(p.split()) for p in pages)
            if word_count<500: raise ValueError(f'Only {word_count} words; possible wrapper/error page')
            author='Greg Abel' if year==2025 else 'Warren Buffett'
            start=len(chunks)
            for page_no,text in enumerate(pages,1):
                # The Munger essay starts at PDF page 38 (printed page 39).
                page_author=author
                if year==2014 and page_no>=38:page_author='Charlie Munger'
                words=normalize(text).split()
                for offset in range(0,len(words),128):
                    passage=' '.join(words[offset:offset+160])
                    if len(passage.split())<25:continue
                    chunks.append({'id':f'{year}-{page_no}-{offset}', 'year':year,
                        'author':page_author,'page':page_no if suffix=='.pdf' else 0,
                        'url':url,'text':passage})
            documents.append({'year':year,'url':url,'format':suffix[1:],'pages':len(pages),
                'words':word_count,'chunks':len(chunks)-start,'sha256':hashlib.sha256(raw).hexdigest(),
                'author':author if year!=2014 else 'Warren Buffett and Charlie Munger'})
            print(f'{year}: {len(pages)} pages, {word_count} words, {len(chunks)-start} passages',flush=True)
        except Exception as e:
            failures.append({'year':year,'url':url,'error':str(e)})
            print(f'{year}: FAILED {e}',flush=True)
    data={'prepared_at':datetime.now(timezone.utc).isoformat(),'documents':documents,
          'missing':failures,'chunks':chunks,'words_per_chunk':160,'overlap':32}
    atomic(WORK/'corpus.json',json.dumps(data,ensure_ascii=False).encode())
    if failures:raise RuntimeError(f'{len(failures)} letters failed; inspect work/corpus.json')
    return data

def download_model():
    revision_file=WORK/'model_revision.json'
    if revision_file.exists():info=json.loads(revision_file.read_text())
    else:
        info=json.loads(fetch(f'https://huggingface.co/api/models/{MODEL_ID}'))
        atomic(revision_file,json.dumps({'sha':info['sha']}).encode())
    revision=info['sha']
    for name in ['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_quantized.onnx']:
        path=MODEL_DIR/name
        if not path.exists():
            print(f'Downloading model asset {name}',flush=True)
            atomic(path,fetch(f'https://huggingface.co/{MODEL_ID}/resolve/{revision}/{name}'))
    return revision

class Encoder:
    def __init__(self):
        import onnxruntime as ort
        from tokenizers import Tokenizer
        self.tokenizer=Tokenizer.from_file(str(MODEL_DIR/'tokenizer.json'))
        self.tokenizer.enable_truncation(max_length=256)
        self.tokenizer.enable_padding(pad_id=0,pad_token='[PAD]')
        options=ort.SessionOptions();options.intra_op_num_threads=4
        self.session=ort.InferenceSession(str(MODEL_DIR/'onnx/model_quantized.onnx'),sess_options=options,providers=['CPUExecutionProvider'])
    def __call__(self,texts):
        import numpy as np
        encoded=self.tokenizer.encode_batch(texts)
        inputs={'input_ids':np.array([x.ids for x in encoded],dtype=np.int64),
                'attention_mask':np.array([x.attention_mask for x in encoded],dtype=np.int64),
                'token_type_ids':np.array([x.type_ids for x in encoded],dtype=np.int64)}
        values=self.session.run(None,{x.name:inputs[x.name] for x in self.session.get_inputs()})[0]
        mask=inputs['attention_mask'][...,None]
        pooled=(values*mask).sum(1)/mask.sum(1).clip(1)
        return (pooled/np.linalg.norm(pooled,axis=1,keepdims=True).clip(1e-12)).astype(np.float32)

def build_index(data):
    import numpy as np
    import chromadb
    revision=download_model()
    encoder=Encoder()
    corpus_hash=hashlib.sha256(json.dumps(data['chunks'],sort_keys=True).encode()).hexdigest()
    collection_name='letters_'+corpus_hash[:12]+'_'+revision[:8]
    client=chromadb.PersistentClient(path=str(ROOT/'chroma_db'))
    collection=client.get_or_create_collection(collection_name,embedding_function=None,configuration={'hnsw':{'space':'cosine'}})
    chunks=data['chunks'];embeddings=[]
    for start in range(0,len(chunks),24):
        batch=chunks[start:start+24]
        cached=collection.get(ids=[c['id'] for c in batch],include=['embeddings'])
        cache={i:e for i,e in zip(cached['ids'],cached['embeddings'])} if cached['embeddings'] is not None else {}
        missing=[c for c in batch if c['id'] not in cache]
        if missing:
            vectors=encoder([c['text'] for c in missing])
            collection.upsert(ids=[c['id'] for c in missing],embeddings=vectors.tolist(),
                documents=[c['text'] for c in missing],metadatas=[{k:v for k,v in c.items() if k not in ['text','id']} for c in missing])
            cache.update({c['id']:e for c,e in zip(missing,vectors)})
        embeddings.extend(cache[c['id']] for c in batch)
        if start%240==0:print(f'Embedded {min(start+24,len(chunks))}/{len(chunks)}',flush=True)
    matrix=np.array(embeddings,dtype='<f4')
    assert matrix.shape==(len(chunks),384)
    assert collection.count()==len(chunks)
    metadata={k:v for k,v in data.items() if k!='chunks'}
    metadata.update({'model':MODEL_ID,'revision':revision,'collection':collection_name,
        'corpus_hash':corpus_hash,'dimensions':384,'passages':len(chunks),
        'model_sha256':hashlib.sha256((MODEL_DIR/'onnx/model_quantized.onnx').read_bytes()).hexdigest()})
    atomic(DIST/'corpus.json',json.dumps({'metadata':metadata,'chunks':chunks},ensure_ascii=False,separators=(',',':')).encode())
    atomic(DIST/'vectors.f32',matrix.tobytes())
    atomic(WORK/'index_info.json',json.dumps(metadata,indent=2).encode())
    print(json.dumps({'letters':len(data['documents']),'passages':len(chunks),'collection':collection_name,'vector_bytes':matrix.nbytes}),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--stage',choices=['download','index','all'],default='all');args=parser.parse_args()
    data=download_corpus() if args.stage!='index' else json.loads((WORK/'corpus.json').read_text())
    if args.stage!='download':build_index(data)
