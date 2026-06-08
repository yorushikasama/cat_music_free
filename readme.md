# CatMusicFree

> 本项目基于 [MusicFree](https://github.com/maotoumao/MusicFree) 原项目进行开发与衍生，在原项目基础上进行了二次元风格改造与功能增强。

## 项目简介

CatMusicFree 是一款开源的 Android 音乐播放器，采用 React Native + TypeScript 技术栈开发。项目通过插件系统聚合多个音乐平台资源，支持搜索、播放、下载、歌单管理等功能，并在此基础上融入了二次元风格的 UI 设计与交互动效。

## 与原项目的关系

- **原项目**：[maotoumao/MusicFree](https://github.com/maotoumao/MusicFree) — 由猫头猫开发的开源音乐播放器
- **本项目**：在 MusicFree 原项目基础上进行二次元风格改造，包括粒子特效、萌系动画、毛玻璃质感等视觉升级
- **许可证**：遵循原项目的 AGPL 许可证

## 远程仓库连接

本项目配置了两个远程仓库：

| 远程名称 | 地址 | 说明 |
|----------|------|------|
| `origin` | `https://github.com/maotoumao/MusicFree.git` | 原项目上游仓库，用于同步原项目更新 |
| `cat-music-free` | `https://github.com/yorushikasama/cat_music_free.git` | 本项目仓库，用于推送本项目的开发内容 |

### 常用远程仓库操作

```bash
# 查看远程仓库
git remote -v

# 从原项目拉取最新更新
git fetch origin
git merge origin/main

# 推送到本项目仓库
git push cat-music-free <branch-name>

# 推送到本项目仓库并设置上游跟踪
git push -u cat-music-free <branch-name>
```

## 主要功能

- **多平台音乐聚合**：通过插件系统支持多个音乐平台资源的搜索与播放
- **播放器**：支持列表循环、单曲循环、随机播放，播放速率调节，定时关闭
- **歌单管理**：创建、编辑、导入歌单，支持排序与搜索
- **本地音乐**：支持本地音乐文件的扫描与播放（MP3/FLAC/WMA/WAV/M4A/OGG/AAC/APE/OPUS）
- **下载管理**：支持音乐下载与下载队列管理
- **播放历史**：记录播放历史，方便回溯
- **歌词显示**：支持歌词展示与偏移调整
- **WebDAV 备份**：支持通过 WebDAV 进行数据备份与恢复
- **国际化**：支持简体中文、繁体中文、英文三种语言
- **主题定制**：支持自定义主题颜色与字体大小
- **二次元风格**：粒子特效、萌系动画、毛玻璃质感等视觉增强
- **插件懒加载**：优化启动速度，按需加载插件

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React Native | 0.76.5 | 跨平台移动应用框架 |
| Expo | 52 | React Native 开发工具链 |
| TypeScript | - | 类型安全的 JavaScript 超集 |
| Jotai | 2.9+ | 原子化状态管理 |
| react-native-track-player | - | 音频播放 |
| react-native-mmkv | - | 高性能键值存储 |
| react-native-reanimated | - | 高性能动画 |
| Immer | 10+ | 不可变数据处理 |
| @shopify/flash-list | 1.7 | 高性能列表渲染 |
| lottie-react-native | - | 二次元风格动画播放 |
| @shopify/react-native-skia | - | GPU 加速 2D 图形渲染 |
| moti | - | 声明式弹性动画 |
| @react-native-community/blur | - | 原生模糊效果 |

## 安装步骤

### 环境要求

- Node.js >= 20
- Java Development Kit (JDK) 17
- Android Studio（含 Android SDK）
- React Native 开发环境（参考 [React Native 官方文档](https://reactnative.dev/docs/environment-setup)）

### 克隆项目

```bash
# 克隆本项目
git clone https://github.com/yorushikasama/cat_music_free.git
cd cat_music_free

# 如需同时关联原项目上游仓库
git remote add origin https://github.com/maotoumao/MusicFree.git
```

### 安装依赖

```bash
npm install
```

### 运行开发版本

```bash
# 启动 Metro 开发服务器
npm start

# 在 Android 设备/模拟器上运行
npm run android
```

### 构建 Release APK

```bash
npm run build-android
```

> Release 构建需要配置签名密钥，通过 `android/keystore.properties` 文件指定。签名密钥不提交到仓库，需自行生成。

## 使用方法

1. **安装应用**：构建或下载 APK 后安装到 Android 设备
2. **导入插件**：进入侧边栏 → 插件管理 → 安装插件（支持从 URL 或本地文件安装）
3. **搜索音乐**：在首页搜索栏输入关键词，选择音乐平台进行搜索
4. **播放音乐**：点击歌曲即可播放，底部音乐栏显示当前播放信息
5. **管理歌单**：在歌单页面创建、编辑、导入歌单
6. **下载音乐**：长按歌曲选择下载，在下载管理页查看进度
7. **备份数据**：进入设置 → 备份设置，配置 WebDAV 进行数据备份
8. **启用懒加载**：侧边栏 → 基本设置 → 插件 → 开启"插件懒加载"以优化启动速度

## 项目结构

```
src/
├── assets/               # 静态资源（图标、图片）
├── components/           # 可复用组件
│   ├── base/             # 基础组件（按钮、文本、图标等）
│   ├── dialogs/          # 弹窗组件
│   ├── mediaItem/        # 媒体项组件
│   ├── musicBar/         # 底部音乐栏
│   ├── musicList/        # 音乐列表
│   └── panels/           # 面板组件
├── constants/            # 常量定义
├── core/                 # 核心业务逻辑
│   ├── trackPlayer/      # 播放器核心
│   ├── pluginManager/    # 插件管理器
│   ├── musicSheet/       # 歌单管理
│   ├── router/           # 路由系统
│   └── i18n/             # 国际化
├── hooks/                # 自定义 React Hooks
├── pages/                # 页面组件
├── service/              # 后台播放服务
├── types/                # 全局类型定义
└── utils/                # 工具函数
```

## 注意事项

- 本项目当前**仅支持 Android 平台**，暂不支持 iOS
- 插件需要用户自行安装，应用本身不内置音乐资源
- 插件在沙箱环境中执行，仅暴露白名单内的第三方库
- Release 构建需要自行配置签名密钥（`keystore.properties`），密钥文件不提交到仓库
- 推送代码时注意区分远程仓库：`origin` 为原项目上游，`cat-music-free` 为本项目仓库
- 代码提交信息需遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 提交前会自动执行 ESLint 检查（通过 Husky pre-commit 钩子）

## 许可证

本项目遵循 [AGPL](https://www.gnu.org/licenses/agpl-3.0.html) 许可证开源。

## 致谢

- [MusicFree](https://github.com/maotoumao/MusicFree) — 原项目作者猫头猫
- 所有开源依赖库的贡献者
