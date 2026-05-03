# 伴侣沟通工具箱 PWA 部署说明

这是一个移动端优先、可共享数据的 PWA 项目。部署完成后，双方用同一个网页链接访问，用同一个房间码和 PIN 进入，即可共享话题卡、评分、问题栏、回答、评论、回复和共同规则。

## 一、项目结构

```text
couple_comm_pwa/
├── index.html                 # PWA 主页面
├── styles.css                 # 移动端样式
├── app.js                     # 前端逻辑
├── manifest.webmanifest       # PWA 安装配置
├── sw.js                      # 离线缓存 Service Worker
├── assets/icon.svg            # App 图标
├── api/                       # Vercel Serverless API
│   ├── _utils.js
│   ├── room.js
│   ├── topics.js
│   ├── questions.js
│   └── rules.js
├── supabase_schema.sql        # Supabase 数据库建表脚本
├── vercel.json                # Vercel 配置
└── package.json
```

## 二、推荐部署方案

推荐使用：

- 前端与 Serverless API：Vercel
- 数据库：Supabase Postgres

原因：

- PWA 需要通过网页链接访问，不能依赖手机本地打开 HTML。
- A/B 共享数据需要云端数据库。
- Supabase service role key 必须放在服务端环境变量里，不能写在浏览器代码里。

## 三、Supabase 设置

1. 登录 Supabase。
2. 创建一个新项目。
3. 进入 SQL Editor。
4. 复制 `supabase_schema.sql` 的全部内容并运行。
5. 进入 Project Settings → API，记录：
   - Project URL：后续填入 `SUPABASE_URL`
   - service_role key：后续填入 `SUPABASE_SERVICE_ROLE_KEY`

注意：`service_role key` 不能公开，不能写入前端 JS，不能发给其他人。

## 四、Vercel 部署

### 方式 A：GitHub + Vercel

1. 把整个 `couple_comm_pwa` 文件夹上传到 GitHub 仓库。
2. 登录 Vercel。
3. 选择 Add New Project，导入该 GitHub 仓库。
4. Framework Preset 选择 Other 或默认静态项目。
5. 添加环境变量：

```text
SUPABASE_URL=你的 Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role key
```

6. 点击 Deploy。
7. 部署成功后会得到一个网页链接，例如：

```text
https://your-project.vercel.app
```

双方用这个链接打开即可。

### 方式 B：本地 CLI 部署

安装 Vercel CLI 后，在项目目录运行：

```bash
npm install
npx vercel
npx vercel env add SUPABASE_URL
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel --prod
```

## 五、手机使用方式

### iPhone

1. 用 Safari 打开 Vercel 生成的网页链接。
2. 点击分享按钮。
3. 选择“添加到主屏幕”。
4. 后续从桌面图标打开。

### Android

1. 用 Chrome 打开网页链接。
2. 点击菜单。
3. 选择“添加到主屏幕”或“安装应用”。

## 六、共享使用流程

1. 第一次进入 App，创建一个共享房间。
2. 设置 A 方姓名、B 方姓名和 PIN。
3. 系统生成房间码。
4. 另一方打开同一个网页链接，选择“加入房间”。
5. 输入房间码和 PIN。
6. 选择本机默认身份：A 方或 B 方。
7. 双方即可共享数据。

## 七、问题栏规则

- 每个月每一方可以提出一个问题。
- 问题提交后，另一方可以回答。
- 双方都可以继续评论。
- 评论支持回复。
- 数据按房间共享。

## 八、当前版本能力

- 基础信息设置：A/B 姓名、本机默认身份、房间码、PIN。
- 话题卡：沟通开始前建立话题。
- A/B 双角色：表达方与承接方任务不同。
- 沟通中辅助：话术、暂停、主话题停车场。
- 完整评分体系：5 大维度、33 个指标、总分与诊断。
- 复盘卡：卡点、有效做法、下次规则。
- 共同规则库：沉淀长期关系规则。
- 本月问题栏：问题、回答、评论、回复。
- 历史记录：话题卡、评分、规则、导出。
- PWA：支持添加到手机主屏幕。

## 九、隐私与安全提醒

这个项目使用房间码 + PIN 作为轻量访问控制，并通过服务端 API 隐藏 Supabase service role key。它适合私人原型和小范围使用，但不建议记录极端敏感、不可泄露或涉及安全风险的内容。

如果要做成正式产品，建议增加：

- 用户登录
- 更细粒度权限控制
- 数据加密
- 自动备份
- 删除账户与数据导出机制
- 审计日志
- 更完整的隐私政策

## 十、后续可扩展方向

- A/B 分设备独立填写后合并视图
- 共同规则执行提醒
- 高频卡点趋势图
- 周复盘自动总结
- 情绪状态日历
- 更多问题栏模板
- 云端图片/语音附件
- 多房间支持
