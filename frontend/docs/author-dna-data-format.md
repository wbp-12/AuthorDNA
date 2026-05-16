# AuthorDNA 数据格式

这份文档定义前端当前使用的标准化数据结构。前端运行时从 `GET /data/author-dna-dataset.json` 读取该 JSON，并在本地做轻量归一化与展示。

## 根结构

```json
{
  "schemaVersion": "1.0",
  "document": { "title": "...", "paragraphs": ["...", "..."] },
  "profile": { "name": "...", "samplesAnalyzed": 0, "wordsProfiled": 0, "voiceSummary": "..." },
  "metrics": [],
  "suggestions": []
}
```

## 字段说明

### `schemaVersion`

当前数据格式版本。用于后续兼容字段升级。

### `document`

- `title`: 文档标题。
- `paragraphs`: 按段落拆分后的正文数组。前端用它重建文档视图和句子视图。

### `profile`

- `name`: 用户名或作者名。
- `samplesAnalyzed`: 已分析样本数。
- `wordsProfiled`: 已分析词数。
- `voiceSummary`: 用一句话概括作者风格。

### `metrics`

每个元素表示一个风格维度：

- `id`: 稳定标识。
- `name`: 维度名称，例如 `Sentence Flow`。
- `score`: 0-100 分数。
- `observation`: 维度说明。
- `subMetrics`: 子指标数组，每项包含 `label`、`userValue`、`textValue`、`aligned`。

### `suggestions`

每个元素表示一条改写建议：

- `id`: 稳定标识，作为一种排序依据（默认排序依据是目标句顺序）。
- `category`: 建议所属维度。
- `severity`: `low | medium | high`。
- `excerpt`: 原文侧栏摘要（显示状态的目标句），只用于右侧建议卡片展示。
- `paragraphIndex`: 该建议属于正文中的第几个段落，从 0 开始。
- `targetText`: 原文中要定位和替换的完整文本（目标句）。
- `observation`: 建议说明。
- `tradeoff.gain`: 接受建议后的收益。
- `tradeoff.loss`: 接受建议后的代价。
- `proposed`: 完整的新文本。前端句子 diff 和 prompt 生成都使用这个字段。
- `proposedPreview`: 可选。仅用于右侧建议卡片显示的短预览，如果不提供，前端会回退到 `proposed`。
- `sentenceDiff.mode`: 可选，`block` 或 `word`。有这个字段时，前端优先按它展示句子 diff；没有时使用前端现有的相似度回退逻辑。

## 句子视图约定

- 句子视图只使用 `targetText` 和 `proposed`。
- `excerpt` 只用于右侧建议卡片，不参与句子 diff 定位。
- 当 `sentenceDiff.mode = block` 时，前端应整块显示删除/添加。
- 当 `sentenceDiff.mode = word` 时，前端应尽量做词级 diff。

## 给模型构建 prompt 的建议顺序

后续如果要把数据拼成模型 prompt，推荐按下面顺序组装：

1. `profile.voiceSummary`
2. `metrics` 的摘要信息
3. `document.title`
4. `document.paragraphs`
5. `suggestions` 的 `category`、`observation`、`tradeoff`、`targetText`、`proposed`
6. 如需控制句子 diff 样式，再额外附上 `sentenceDiff.mode`

一个典型 prompt 可以是：

```text
You are analyzing an author's voice.
Voice summary: ...
Document title: ...
Document paragraphs: ...
Relevant suggestions: ...
```

## 兼容策略

- 未来后端如果返回同名 JSON，可以直接替换 `/data/author-dna-dataset.json`。
- 如果某条建议缺少 `sentenceDiff.mode`，前端会继续使用当前的相似度回退判断。
- 如果某条建议缺少 `proposedPreview`, 右侧卡片会直接展示 `proposed`。
