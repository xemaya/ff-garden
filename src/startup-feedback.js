export function showStartupFailure({document,root,error,label='街区',reload=()=>location.reload()}){
 root.hidden=false;root.classList.remove('done');root.classList.add('startup-recovery');root.setAttribute('aria-busy','false');
 const title=document.createElement('strong'),message=document.createElement('p'),retry=document.createElement('button'),home=document.createElement('a');
 title.textContent=label+'暂未准备好';message.setAttribute('role','status');
 message.textContent=error?.name==='AssetLoadTimeoutError'?'等待太久，已停止本次等待。':error?.name==='AssetLoadCancelledError'?'已停止等待。':error instanceof SyntaxError?'收到的资料无法解析。':'加载未完成，请检查连接后再试。';
 const note=document.createElement('p');note.textContent='重新载入会保留当前链接和本地邮路。也可以先返回王城入口。';
 retry.type='button';retry.textContent='重新载入当前页面';retry.addEventListener('click',()=>{if(retry.disabled)return;retry.disabled=true;reload();});
 home.href='/';home.textContent='返回王城入口';root.replaceChildren(title,message,note,retry,home);retry.focus();
}
