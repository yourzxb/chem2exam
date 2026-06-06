# OpenClaw 部署说明

本文档用于让 OpenClaw 或其他部署代理在一台 Ubuntu 笔记本 / 小型服务器上直接部署 Chem2Exam。

推荐部署场景：

- 学校内网试点。
- 教研组演示。
- 一个班级到少量班级使用。
- 旧联想 Ubuntu 笔记本，8G 内存、256G 硬盘。

不建议把这台旧笔记本直接暴露到公网。若需要公网访问，建议后续迁移到正式云服务器，并补充域名、HTTPS、备案、监控和备份策略。

## 1. OpenClaw 执行目标

请 OpenClaw 完成以下目标：

1. 安装 Node.js 20.9 或更高版本，推荐 Node.js 22 LTS。
2. 安装 Docker 和 Docker Compose 插件。
3. 在项目目录中创建 `.env`。
4. 启动 PostgreSQL。
5. 安装依赖、同步数据库、导入种子数据。
6. 构建 Next.js 生产版本。
7. 创建 systemd 服务，让网站开机自启。
8. 放行内网访问端口 `4174`。
9. 执行验证脚本，确认学生端、老师端、管理端、审核端能跑通。

## 2. 服务器要求

最低建议：

- CPU：2 核或以上。
- 内存：8G。
- 硬盘：剩余 30G 以上，建议 SSD。
- 系统：Ubuntu 22.04 LTS 或 Ubuntu 24.04 LTS。
- 网络：学校局域网内稳定连接，最好使用网线。

## 3. 安全红线

部署代理必须遵守：

- 不要把 `.env`、登录口令、模型访问凭据写入测试报告或公开文档。
- PostgreSQL 只给本机应用访问，不向校园网开放 `5432`。
- 学生端只能使用已发布题目。
- AI 输出必须进入人工审核，不得直接发布。
- 学生端不得出现“乱做”“低投入”“不认真”等负面标签。
- 如果管理员后续添加 DeepSeek、智谱 GLM 等模型访问凭据，只能通过管理端后端保存，不能写入前端代码。

## 4. 首次部署命令

以下命令假设项目位于当前目录。如果 OpenClaw 是从仓库拉取项目，可以先进入项目目录：

```bash
cd /path/to/chem2exam
```

安装系统依赖：

```bash
sudo apt update
sudo apt install -y curl git openssl docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

安装 Node.js 22：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

创建环境变量文件：

```bash
cp .env.example .env
AUTH_SECRET_VALUE="$(openssl rand -hex 32)"
sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=\"${AUTH_SECRET_VALUE}\"|" .env
# 仅用于局域网 HTTP 试用；如果换成 HTTPS 域名部署，应改为 true。
grep -q '^AUTH_COOKIE_SECURE=' .env || echo 'AUTH_COOKIE_SECURE="false"' >> .env
```

启动数据库：

```bash
sudo docker compose up -d postgres
sudo docker ps --filter name=chem2exam-postgres
```

安装依赖并初始化：

```bash
npm ci
npm run db:generate
npm run db:push
npm run db:seed
npm run build
```

## 5. 创建系统服务

在项目目录中执行：

```bash
APP_DIR="$(pwd)"
NPM_BIN="$(command -v npm)"
APP_USER="$(whoami)"

sudo tee /etc/systemd/system/chem2exam.service >/dev/null <<EOF
[Unit]
Description=Chem2Exam Next.js service
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
EnvironmentFile=${APP_DIR}/.env
ExecStart=${NPM_BIN} run start -- -p 4174 -H 0.0.0.0
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now chem2exam
sudo systemctl status chem2exam --no-pager
```

如果系统启用了防火墙，只放行网站端口：

```bash
sudo ufw allow 4174/tcp
sudo ufw status
```

不要放行 `5432`。

## 6. 验证部署

先确认本机服务可访问：

```bash
curl -I http://127.0.0.1:4174
```

执行页面冒烟验证：

```bash
VERIFY_BASE_URL=http://127.0.0.1:4174 npm run verify:smoke
```

执行演示账号登录验证：

```bash
VERIFY_BASE_URL=http://127.0.0.1:4174 npm run verify:demo-login
```

如果这是首次部署，且允许重新导入本地试点种子数据，可以执行完整验证：

```bash
VERIFY_BASE_URL=http://127.0.0.1:4174 npm run verify:all
```

注意：`verify:all` 会重新执行数据库准备和种子数据导入。正式试点已经有真实数据后，不要随意执行 `npm run db:seed` 或 `npm run verify:all`。

## 7. 学生访问地址

查询 Ubuntu 笔记本的局域网 IP：

```bash
hostname -I | awk '{print $1}'
```

假设输出是：

```text
192.168.1.23
```

学生在同一个学校 Wi-Fi 或机房网络中访问：

```text
http://192.168.1.23:4174/student
```

老师访问：

```text
http://192.168.1.23:4174/teacher
```

管理员访问：

```text
http://192.168.1.23:4174/admin
```

审核端访问：

```text
http://192.168.1.23:4174/review
```

## 8. 试点演示账号

首次导入种子数据后，四端登录区都有“演示账号”按钮。也可手动输入：

| 端口 | 用户名 | 用途 |
| --- | --- | --- |
| 学生端 | `demo_student_01` | 查看学习报告、复盘任务、奖励和知识图谱诊断 |
| 老师端 | `demo_teacher` | 查看示范班级报告、学生下钻、复盘跟进和讲评素材 |
| 管理端 | `demo_admin` | 查看学校组织、题库、知识图谱、学校汇总和 AI 配置 |
| 审核端 | `demo_admin` | 查看待审题和一审发布流程 |

登录口令只应保存在本地安全记录中，不要写入公开报告。

## 9. 日常运维命令

查看网站服务状态：

```bash
sudo systemctl status chem2exam --no-pager
```

查看网站日志：

```bash
journalctl -u chem2exam -n 100 --no-pager
```

重启网站：

```bash
sudo systemctl restart chem2exam
```

查看数据库容器：

```bash
sudo docker ps --filter name=chem2exam-postgres
```

重启数据库：

```bash
sudo docker compose restart postgres
```

## 10. 数据备份

每天试点结束后建议备份一次数据库：

```bash
mkdir -p backups
sudo docker exec chem2exam-postgres pg_dump -U chem2exam -d chem2exam > "backups/chem2exam-$(date +%F-%H%M).sql"
ls -lh backups
```

如果以后需要恢复：

```bash
cat backups/chem2exam-YYYY-MM-DD-HHMM.sql | sudo docker exec -i chem2exam-postgres psql -U chem2exam -d chem2exam
```

恢复前必须先确认当前数据库是否还需要保留，避免覆盖真实试点数据。

## 11. 后续更新部署

如果代码有更新：

```bash
git pull
npm ci
sudo docker compose up -d postgres
npm run db:generate
npm run db:push
npm run build
sudo systemctl restart chem2exam
VERIFY_BASE_URL=http://127.0.0.1:4174 npm run verify:smoke
VERIFY_BASE_URL=http://127.0.0.1:4174 npm run verify:demo-login
```

正式试点有真实数据后，更新时不要执行：

```bash
npm run db:seed
```

除非明确要重置为演示数据。

## 12. 常见问题

### 12.1 学生打不开网页

检查：

```bash
sudo systemctl status chem2exam --no-pager
hostname -I
sudo ufw status
```

确认学生和服务器在同一个局域网，访问地址使用服务器局域网 IP，而不是 `localhost`。

### 12.2 数据库连接失败

检查：

```bash
sudo docker ps --filter name=chem2exam-postgres
sudo docker compose logs postgres --tail=80
```

确认 `.env` 中的数据库地址仍指向本机 PostgreSQL。

### 12.3 4174 端口被占用

检查：

```bash
sudo lsof -nP -iTCP:4174 -sTCP:LISTEN
```

如果是旧的 Chem2Exam 服务，重启：

```bash
sudo systemctl restart chem2exam
```

### 12.4 旧笔记本休眠导致网站中断

在 Ubuntu 设置中关闭自动睡眠，并保持电源连接。课堂试点时建议使用网线。

## 13. 部署完成标准

OpenClaw 完成部署后，必须给出以下结果：

- 网站服务状态为 active。
- PostgreSQL 容器为 running。
- `VERIFY_BASE_URL=http://127.0.0.1:4174 npm run verify:smoke` 通过。
- `VERIFY_BASE_URL=http://127.0.0.1:4174 npm run verify:demo-login` 通过。
- 给出学生端局域网访问地址，例如 `http://192.168.1.23:4174/student`。
- 不输出任何真实模型访问凭据、会话凭证或数据库明文连接串。
