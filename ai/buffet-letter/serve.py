"""Serve the same app locally, with Python/ChromaDB powering meaning search."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse,json,threading
import chromadb
from prepare_corpus import Encoder,ROOT

class SearchService:
    def __init__(self):
        info=json.loads((ROOT/'work/index_info.json').read_text())
        self.client=chromadb.PersistentClient(path=str(ROOT/'chroma_db'))
        self.collection=self.client.get_collection(info['collection'],embedding_function=None)
        self.encoder=Encoder();self.lock=threading.Lock()
    def search(self,p):
        query=str(p.get('query','')).strip()
        start,end=int(p.get('from',1977)),int(p.get('to',2024))
        author=p.get('author','Warren Buffett');contains=str(p.get('contains',''))
        if not query or len(query)>500 or not 1977<=start<=end<=2025:raise ValueError('Invalid query or year range')
        if author not in ['all','Warren Buffett','Charlie Munger','Greg Abel']:raise ValueError('Invalid author')
        conditions=[{'year':{'$gte':start}},{'year':{'$lte':end}}]
        if author!='all':conditions.append({'author':author})
        with self.lock:
            vector=self.encoder([query])[0]
            result=self.collection.query(query_embeddings=[vector.tolist()],n_results=min(200,self.collection.count()),
                where={'$and':conditions},where_document={'$contains':contains} if contains else None,include=['distances'])
        return {'results':[{'id':i,'score':1-d} for i,d in zip(result['ids'][0],result['distances'][0])]}

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path=='/runtime.json':return self.json_response({'mode':'chroma'})
        return super().do_GET()
    def do_POST(self):
        if self.path!='/api/search':return self.json_response({'error':'Not found'},404)
        # Local service: keep requests on this host; never expose a notebook kernel.
        origin=self.headers.get('Origin')
        if origin and origin not in [f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}']:
            return self.json_response({'error':'Origin not allowed'},403)
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=10000:raise ValueError('Invalid request size')
            result=self.server.search.search(json.loads(self.rfile.read(size)))
            self.json_response(result)
        except (ValueError,TypeError,KeyError,json.JSONDecodeError) as e:self.json_response({'error':str(e)},400)
        except Exception:self.json_response({'error':'Search failed; check the local server log'},500)
    def json_response(self,data,status=200):
        body=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765);args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(ROOT/'dist')))
    server.search=SearchService()
    print(f'Local: http://127.0.0.1:{args.port}',flush=True)
    server.serve_forever()
