# 独立工程结构

- `src/`：实时街道、建筑模块、树与王城、广场、角色及行为。
- `public/data/`：固定入口样板、三条保存的小模型输出，以及本轮手工编排的 `royal-city.json`。王城复用风格库，但未调用新的模型生成。
- `public/assets/`：浏览器实际使用的 PNG 与 GLB，包含对照预览所用旧 GLB。
- `authoring/characters/`：历次 Blender 可编辑工程，贴图已经嵌入并保留仓内相对路径；不随生产构建发布。
- `art-direction/`：美术目标图、提示词、生成记录、角色 manifest。
- `tools/build-*.py`：Blender 程序化造型、蒙皮、动画、导出与质量检查。用 Blender `--background --python` 执行，GLB/textures 写到 public，`.blend` 写到 authoring。
- `tools/verify*.mjs`：场景、角色、资产哈希及扫掠导航检查；运行不需要 GPU。
- `tools/generate-streets.mjs` 与 `tools/remote/`：完整的可选 4B 约束生成工具，不再读取兄弟 FF7 工程。
- `evidence/`：各轮实验、制作与浏览器检查结果，历史 ZIP/source 用于追溯。
- `deploy/`：专属 nginx、校验上传与原子发布、回滚、域名/证书配置说明。

## 可选布局重新生成

日常预览和部署不需要重新推理。确需重新生成三条街道时：

```sh
FF_GENERATION_HOST=shouyun-4090 npm run generate:streets
```

这一步会修改保存的布局与实验结果，并临时启动小模型服务。远端需要缓存的 Qwen3-4B-Instruct-2507-Q4_K_M GGUF、llama.cpp、Python 和一张有 4.5 GiB 空闲显存的 GPU。主机路径/哈希/端口在 `tools/remote/remote_small_server.py`；该工具只管理自己登记的 loopback 进程，结束后停止自己启动的服务，不停止其他进程。

本次独立工程整理、部署没有运行这个生成命令，也没有恢复已取消的 HunyuanWorld 工程。

## 历史记录

复制了当前 FF9 工程的全部源码、原始图片、GLB、Blender 工程、输出布局、文档与检查证据。没有复制 `node_modules`、`dist`、Vite 缓存、重复的 `.blend1` 自动备份；这些分别可重建或有正式 `.blend` 保存。跨阶段经验归档在 `docs/WORLD_GENERATION_LESSONS.md`，其中旧工程路径和早期主机状态是历史事实，当前部署以 `deploy/README.md` 为准。

已有 Blender 工程的贴图便携校验在 `evidence/deployment/blender-portability.json`。可使用 `blender -b --factory-startup --python tools/pack-authoring.py` 重新打包；该脚本不修改运行时 GLB。

## 听风王城与邮差模块

- `royal-layout.js`：四区步行路线、实体与碰撞共用记录、城门出口、地图范围和远景完整投影距离。
- `royal-city.js`：室外王城建筑及独立远景；主街建筑继续使用 `hero.js`，静态部件交给 `batch.js` 按材质合批。
- `postal-content.js`：三封关联委托、城市石牌故事、结尾文案。保留早期见闻ID以兼容实验存档。
- `postal-journey.js`：纯故事规则、v1迁移、保护未知版本、有限备份与恢复、跨页读取前核验。
- `postal-world.js`：实际角色、距离、视图和邮差行为映射；不负责DOM或存储。
- `postal-view.js` 与 `postal-controller.js`：任务提示、手记分页、主动交接/观察、确认与键盘焦点。
- `postal-observations.js` 与 `observation-markers.js`：实体石牌位置、朝向/距离门槛、世界造型和手记回顾。
- `view-transitions.js`：保留地图往返时的街道锚点，防止中断动画时保存飞行中的相机位置。

[玩家指南](POSTAL_PLAYER_GUIDE.md)与[本轮设计及验收](postal-journey-design.md)保留运行方式、存档边界和逐切片QA范围。本轮未重新运行模型生成、Blender资产生成或生产部署。
