# ff.buplayground.cn 部署

本站是公开静态 3D 演示；源码仓库为私有 `xemaya/ff-garden`。浏览器只读取保存的街道布局和 GLB，不调用模型、训练或 4090 GPU 服务。角色工程 `.blend`、脚本和美术目标图不在 web 目录。

## 已有主机约定

- SSH 配置别名：`shouyun-4090`（可由 `--host` 替换）；SSH 私钥留在个人环境，仓库不包含凭据。
- 阿里云 DNS：`ff.buplayground.cn` A → `60.165.239.26`，TTL 600。
- Web 根：`/data/app/huanghaibin/web/sites/ff-garden/current`。
- Releases：`.../ff-garden/releases/<UTC timestamp>-<git commit>/site`。
- nginx：`/home/huanghaibin/envs/web/bin/nginx`；主配置 `/data/app/huanghaibin/web/conf/nginx.conf`。
- 专属配置：`/data/app/huanghaibin/web/conf/sites/ff-garden.conf`；主配置仅新增这一条 include。
- 证书：`/data/app/huanghaibin/web/letsencrypt/live/ff.buplayground.cn/`，独立于 ai/director/files 证书。

## 本地构建与发布

要求 Node.js 22 或更高、npm、Python 3.9+，以及既有 SSH 主机访问权限。首次克隆：

```sh
git clone https://github.com/xemaya/ff-garden.git
cd ff-garden
npm ci
npm run check
npm run build
# 提交源码后发布；脚本默认重跑检查和构建。
npm run deploy
# 指定另一个已经按本文约定配置好的 SSH 别名：
python3 deploy/publish.py --host your-web-host
```

流程：全部自动测试与布局/角色校验 → 构建 → 检查 Git 工作区干净 → 计算完整 `dist` 文件清单 → 仅打包与当前 release 不同的文件 → SHA-256 校验上传 → 创建不可覆盖的新 release → 备份旧 nginx/current → 添加专属 include → nginx 配置检查 → 原子切换 current → 平滑重载 → 五个 HTTPS 入口检查。失败时恢复原 current、原专属配置和原共享配置。相同素材按 SHA-256 复核后从旧 release 硬链接复用；变更文件总是写入新文件，避免修改旧版本。不会调用世界生成脚本，不删除旧 release，也不重启现有业务。

`--skip-build` 仅供刚完成 `npm run check && npm run build` 的构建使用。发布记录与上传包留在本机 `.deploy/`（Git 忽略）。

## 首次域名与证书准备

仅当 `ff` 记录不存在时，使用已认证的阿里云 CLI 添加记录。下述域名和主机属于当前部署；迁移服务器需先调整它们。

```sh
aliyun alidns DescribeDomainRecords --DomainName buplayground.cn --RRKeyWord ff --PageSize 100
aliyun alidns AddDomainRecord --DomainName buplayground.cn --RR ff --Type A --Value 60.165.239.26 --TTL 600
```

确认权威 DNS 已返回新记录后，在服务器使用现有 Certbot 账户和共享 HTTP-01 webroot 为 FF 单独签发证书：

```sh
/home/huanghaibin/envs/webui/bin/certbot certonly --non-interactive \
  --webroot -w /data/app/huanghaibin/web/acme \
  --config-dir /data/app/huanghaibin/web/letsencrypt \
  --work-dir /data/app/huanghaibin/web/letsencrypt/work \
  --logs-dir /data/app/huanghaibin/web/logs \
  --cert-name ff.buplayground.cn -d ff.buplayground.cn
```

现有每周证书续期使用同一个 config-dir，自动包含 FF 的 renewal 配置；续期后由既有 `web.sh renew` 重载 nginx。不要复制私钥到仓库。

## 回滚

先通过 SSH 列出 `.../ff-garden/releases/`，再切到已有 release：

```sh
python3 deploy/rollback.py 20261006T000000Z-012345678abc
```

回滚脚本只切换 FF 的 current 并检查 HTTPS；静态文件切换不需要重载 nginx。若还修改了 FF nginx 策略，需同时核对专属配置与 release 的 `ff-garden.nginx.conf`。首次接入的主配置备份在 `.../ff-garden/backups/<release>/nginx-before.conf`；恢复共享配置前必须比较之后其他站点的改动，不能覆盖后续变更。

## CI

GitHub Actions 在 push main/PR 上执行独立 `npm ci`、全部校验与构建，保存 14 天静态 artifact。发布使用上面的本地 SSH 脚本；CI 没有配置服务器私钥或自动线上写权限。

## 上线验证

- HTTPS 主站和三种街道、三张角色页面；素材请求为真实 PNG/GLB，不返回 HTML。
- 主街漫游走到王城、角色动画和切换街道正常。
- 不存在的资源返回 404；目录不会列出文件；HTTP 跳转 HTTPS。
- ai/files/director 继续保持原来的门禁跳转。

可以使用仓库中的主机检查脚本复现 HTTP/素材/配置校验：

```sh
ssh shouyun-4090 'python3 -' < deploy/verify-host.py
```

首次上线证据与检查结果：`evidence/deployment/`。
