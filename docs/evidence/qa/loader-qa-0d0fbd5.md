# 0d0fbd5 加载器定向QA

2026-10-06；独立git archive快照qa-0d0fbd5；复用已有node_modules；现有Chrome extension CUA；127.0.0.1:5209。

正常路径通过：
- 主场景ready=true，readyMs约2862ms；pendingCharacters=[]、failedCharacters=[]。wood/plaster/roof-clay/roof-teal/pavers五种材质，failedTextures=[]。代表截图中三GLB、角色表面和地面材质正常。
- 主场景三个actor均frozen=false，有非零动画时间；后续魔导士/陆行鸟Idle时间由1.704增至2.504，莫古利Idle切Walk。
- moogle.html：ready=true，moogle-courier-v3.glb；点击招手后Idle→Wave，time=.182，frozen=false。
- mage.html：ready=true，black-mage-v2.glb；点击小魔法后Idle→Magic，time=.232，frozen=false。
- chocobo.html：ready=true，chocobo-v1.glb；点击展翅后Idle→Flap，time=.266→.383，frozen=false；现场截图可见正常金色表面和角色造型。
- 四页采集warn/error日志均为空。没有发现本次正常传输路径缺陷。

初始简化入口：not observed。首次浏览器观察仍有“等街角的花开好”与角色加载提示，下一次已正常进入，没有观察到可操作的“先用简化材质进入”，未点击，不能声称该路径通过。

没有请求拦截能力，未做超时、取消、失败、晚到覆盖或decode单飞故障注入；未实际等待5min下载/2min decode超时。用户提供的fakeclock 28项测试属于开发单元测试证据，此QA未重跑或独立确认。

未重测旧剧情/双卡/山体；未修改源、提交、push、部署、安装依赖、权限或调试端口。仅调整本地页面视图。服务session52883 Ctrl-C退出；5209无监听；viewport.reset，测试tab.close。

证据：loader-evidence-0d0fbd5.json（各页状态/动画与日志）、loader-main-0d0fbd5.jpg（代表主场景）。
