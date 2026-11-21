let extractor;
let initializing;
self.onmessage=async({data})=>{
  const {id,text}=data;
  try{
    if(!extractor){
      if(!initializing)initializing=(async()=>{
        self.postMessage({id,status:'Loading the meaning search engine…'});
        const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
        env.allowRemoteModels=false;
        env.allowLocalModels=true;
        env.localModelPath='/models/';
        env.backends.onnx.wasm.numThreads=1;
        env.backends.onnx.wasm.proxy=false;
        return pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2',{
          dtype:'q8',device:'wasm',
          progress_callback:p=>{if(p.status==='progress'&&p.file?.endsWith('.onnx'))self.postMessage({id,status:`Loading the search model · ${Math.round(p.progress||0)}%`});}
        });
      })();
      extractor=await initializing;
    }
    const result=await extractor(text,{pooling:'mean',normalize:true,truncation:true,max_length:256});
    self.postMessage({id,vector:Array.from(result.data)});
  }catch(error){initializing=null;self.postMessage({id,error:error.message});}
};
