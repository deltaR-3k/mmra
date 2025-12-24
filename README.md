# RealTalk AI Translator (MMRA)

**Make Messages Real American**  
*An AI-powered, floating translation tool for macOS.*

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇺🇸 English

### Overview
RealTalk is a minimalist, floating macOS application designed to translate Chinese text into authentic American English slang (or professional tones) instantly. It sits quietly on your screen, auto-detects your clipboard, and pastes translations directly into your active conversation.

### Features
*   **Three Tones**: Casual (Gen Z Slang), Neutral, Formal.
*   **Smart Flow**: 
    *   **Auto-Input**: Automatically captures Chinese text from your clipboard when you open the window.
    *   **Real-time Polling**: Updates content instantly if you copy new text while the window is open.
    *   **Auto-Paste**: Automatically pastes the translation into your target app (e.g., Discord, WeChat, Slack).
*   **Morphing UI**: Expands for settings/history, compacts for translation.
*   **History**: Keeps your last 50 translations safe.
*   **Privacy**: Your API keys are stored locally on your device.

### Changelog

#### v3.3 (Current)
*   **Fix**: Packaging issues resolved (Blank window fix).
*   **Fix**: Window now stays visible (Autos-on-top) after Auto-Paste.
*   **Fix**: Window traffic light controls (Close/Minimize) are now clickable.
*   **Docs**: Added Bilingual README.

#### v3.2
*   **UX**: Input field auto-clears after successful Auto-Paste.
*   **Build**: Integrated custom user icon.

#### v3.1
*   **Feature**: Standalone `.dmg` application.
*   **UX**: "Silver Glass" premium icon.
*   **Performance**: Faster clipboard polling (500ms).

---

<a name="chinese"></a>
## 🇨🇳 中文

### 简介
RealTalk 是一款专为 macOS 设计的极简悬浮翻译工具。它利用在大语言模型（LLM）的强大能力，将中文即时翻译成地道的美式俚语（或职场专业英语）。它安静地悬浮在屏幕上，自动吸入剪贴板内容，并直接将翻译结果“投喂”到您的聊天窗口中。

### 核心功能
*   **三种语调**: 
    *   **Casual**: Gen Z 网络俚语 (fr, ngl, rn)。
    *   **Neutral**: 正常交流。
    *   **Formal**: 职场商务风。
*   **智能流 (Smart Flow)**:
    *   **自动吸入**: 唤出窗口时，自动填充剪贴板里的中文。
    *   **实时监听**: 窗口开启时，复制即同步。
    *   **自动粘贴**: 翻译完成后，直接模拟键盘输入到目标软件。
*   **动态界面**: 需要设置时变大，平时保持小巧。
*   **历史记录**: 本地保存最近 50 条记录。
*   **隐私安全**: API Key 仅保存在本地。

### 更新日志 (Changelog)

#### v3.3 (当前版本)
*   **修复**: 修复了打包后打开白屏/无反应的问题 (主要涉及文件路径引用)。
*   **修复**: 修复了自动粘贴后窗口意外消失或被遮挡的问题 (强制置顶)。
*   **修复**: 修复了左上角红黄灯按钮点击无反应的问题。
*   **文档**: 新增中英双语 README。

#### v3.2
*   **体验**: 自动粘贴后，输入框会自动清空，方便连续使用。
*   **构建**: 集成了自定义图标重新打包。

#### v3.1
*   **功能**: 发布独立 `.dmg` 安装包。
*   **外观**: 全新 "银白玻璃" 风格图标。
*   **性能**: 剪贴板轮询速度提升至 500ms。
