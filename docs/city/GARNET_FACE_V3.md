# Garnet v3：替换失败的脸部基础

用户明确否决v2脸部。原先分层轮廓加五官零件的方式没有达到要求，本轮改用已安装MPFB的女性头部基础拓扑；真实的眼睑、眼窝、鼻翼与嘴唇保留为连续网格，并做较薄唇形、轻微嘴角上扬与较大的眼区调整。眼球按原网格眼窝中心定位，眉毛贴合实际脸面。衣服、长发及原四段动作沿用v2，重新绑定新头部。

基础资产是MakeHuman hm08核心网格和随附形状数据。官方[资产许可说明](https://static.makehumancommunity.org/about/license.html)将核心网格、形状等资源列为CC0；软件代码许可另列。本工程保存的是提取、变形后的头部资产和调用脚本，没有复制MPFB程序源码。

`tools/prepare-garnet-head.py` 使用本地已安装MPFB生成女性基底，只保留头部，排除身体及辅助几何。调整后的基底保存在 `authoring/characters/royal-cast/garnet-head-v3.blend`；常规 `tools/build-garnet-v3.py` 从这个项目文件读取，无需重新安装MPFB即可继续构建整个人物。来源和形状设置在 `evidence/garnet-v3/head-provenance.json`。

运行模型是 `public/assets/characters/royal-cast/garnet-v3.glb`，完整编辑源是 `authoring/characters/royal-cast/garnet-v3.blend`。工作台继续使用 `/garnet.html`，版本显示v3。

没有生图、照片贴脸、4090远程推理或训练。v2文件保留为已被否决的脸部对照。v3仍待用户判断美感与Garnet相似度；结构和动作验证不代表人工美术验收。

验证：`npm run verify:garnet` 与 `npm run build` 通过，四方向、四动作及375×667布局已在浏览器检查；构建GLB与源资产一致。
