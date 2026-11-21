# Buffett Letters Search

A private research app and executable notebook for Berkshire Hathaway shareholder letters.

## Start locally

Use Python 3.12. From this folder:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python prepare_corpus.py
python serve.py
```

Then open http://127.0.0.1:8765. The first preparation downloads official letters and a MiniLM model, builds a persistent Chroma database, and exports the browser index. It may take several minutes. No API key is required. The server listens only on your own computer. Stop it with Ctrl+C.

On Windows, activate with `.venv\Scripts\activate` instead. Python and compatible package wheels must be available.

## Run the notebook

Open `buffett_letters_search_ready.ipynb` from this folder in Jupyter or VS Code, select the Python environment above, and run the cells from top to bottom. To use JupyterLab, install it in the same environment with `python -m pip install jupyterlab`, then run `python -m jupyter lab buffett_letters_search_ready.ipynb`.

The ready notebook wraps the validated preparation and search helpers in this folder. The unchanged original is `dist/downloads/buffett_letters_search_original.ipynb` for comparison. The original has its own dependencies and workflow. The portable download excludes generated letters, model, vectors and database; the preparation step builds them.

## Two execution modes

- Hosted app: query embeddings and vector search run in the browser over the exported index. The first meaning search loads the model and a pinned Transformers.js runtime from jsDelivr. Queries are not sent to an AI API. Keyword search works without the model.
- Local app and ready notebook: Python encodes the query and ChromaDB retrieves the matching passages. The local app uses the same interface and original-source links.

A ChatGPT Page displays the guide and notebook attachments. It does not itself host an always-on Jupyter kernel. The Page's reusable prompts launch a chat where execution depends on available Python, package and network access.

## Verified collection

49 annual reporting years, 1977–2025; 4,539 passages; no missing years at preparation. Buffett is the default author (1977–2024). The 2025 annual letter is by Greg Abel. The 2014 anniversary PDF includes Charlie Munger's essay beginning at PDF page 38 (printed page 39); that section is labeled separately. A letter may itself quote another speaker.

PDF page links refer to physical PDF pages, which can differ from printed page numbers. Earlier HTML letters have source links without page numbers. Download failures stop preparation and appear in `work/corpus.json`; failures are never treated as a complete collection.

Passages contain up to 160 words, with 32 words of overlap within a page. The MiniLM model truncates inputs to 256 tokens. Scores are cosine relevance, not confidence. The chart counts only the top retrieved passages, not all mentions across the letters. Read original context before quoting or interpreting results.

## Rebuild and validation

```sh
python prepare_corpus.py --stage download
python prepare_corpus.py --stage index
node test_search.mjs
```

The index name includes a corpus hash and model revision. Preparation reuses cached downloads and embeddings; changing the corpus or model creates a distinct collection. `work/index_info.json` records the corpus hash, source hashes, model revision and coverage. To refresh a cached letter, move that specific file out of `work/letters/` and rerun preparation. Preserve old files if you need a reproducible snapshot.

## Attribution

Letters © Berkshire Hathaway. Official archive: https://www.berkshirehathaway.com/letters/letters.html

The MiniLM ONNX model is Apache-2.0 licensed. See `dist/MODEL_NOTICE.txt` and `dist/MODEL_LICENSE.txt`. This tool is independent of Berkshire Hathaway.
