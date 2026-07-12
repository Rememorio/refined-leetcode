[![Release](https://github.com/Rememorio/refined-leetcode/actions/workflows/release.yml/badge.svg?branch=master)](https://github.com/Rememorio/refined-leetcode/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/Rememorio/refined-leetcode)](https://github.com/Rememorio/refined-leetcode/releases/latest)

# Refined LeetCode

这是 [XYShaoKang/refined-leetcode](https://github.com/XYShaoKang/refined-leetcode) 的维护分支，面向 `leetcode.cn`，保留原扩展的刷题增强功能，并修复已经失效的外部数据源与发布流程。

## 维护状态

- 竞赛预测数据已迁移到 [EntrantHub](https://entranthub.com/contests/leetcode)。
- 发布产物为 Manifest V3 解压扩展 ZIP，不再生成依赖私钥的 CRX。
- 工具链使用 Node.js 22、pnpm 11 和当前 GitHub Actions。
- 原作者与原项目版权归各自所有，本分支继续使用 MIT License。

## 功能

- [答题页](./docs/%E7%AD%94%E9%A2%98%E9%A1%B5.md)：计时、随机一题与竞赛布局增强。
- [竞赛排名页](./docs/%E7%AB%9E%E8%B5%9B%E6%8E%92%E5%90%8D%E9%A1%B5.md)：预测分、实时预测与语言图标。
- [首页帖子黑名单](./docs/%E9%A6%96%E9%A1%B5%E5%B8%96%E5%AD%90%E9%BB%91%E5%90%8D%E5%8D%95.md)。
- [题单管理](./docs/%E9%A2%98%E5%8D%95%E7%AE%A1%E7%90%86.md)：题单侧边栏与题目评分。
- [配置选项](./docs/%E9%85%8D%E7%BD%AE%E9%80%89%E9%A1%B9.md)。

## 安装

1. 从 [Releases](https://github.com/Rememorio/refined-leetcode/releases/latest) 下载 `refined-leetcode.zip` 并解压。
2. 打开 `chrome://extensions/`。
3. 开启右上角的“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择解压后的目录。

升级时下载新版本，替换本地目录后在扩展管理页点击“重新加载”即可。

## 开发

```sh
corepack enable
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

构建产物位于 `dist/`。更完整的开发流程见 [docs/开发.md](./docs/%E5%BC%80%E5%8F%91.md)。

## 数据来源

- [EntrantHub](https://github.com/baoliay2008/EntrantHub)：竞赛排名与预测分。
- [zerotrac/leetcode_problem_rating](https://github.com/zerotrac/leetcode_problem_rating)：题目评分。
- [Carrot](https://github.com/meooow25/carrot)：实时预测 FFT 思路。

## 致谢

感谢原作者 [XYShaoKang](https://github.com/XYShaoKang) 和所有上游贡献者。若问题只存在于本维护分支，请在 [Rememorio/refined-leetcode](https://github.com/Rememorio/refined-leetcode/issues) 反馈。
