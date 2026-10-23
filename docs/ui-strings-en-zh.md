# UI 中英文对照表（i18n 源清单）

> 生成日期：2026-10-21。来源：`frontend/src` 全部 TS/TSX 文件 + `src/web/static-app/index.html`。
> 规则（按用户要求）：
> - **单位不翻译**，保持英文缩写：rpm、s、min、°C、Pa、sccm、mL、mg、W、nm、Å/s、rpm/s、mm、cm²、mA/cm²、V、%、bytes 等。
> - **化学药品/材料名称不翻译**：NiOx、SAM、PEAI、EDADI、PCBM、C60、BCP、SnO2、Ag、SiO₂ 等；J–V、PCE、Voc、Jsc、FF 等缩写保持原文。
> - 模板占位符用 `{name}`、`{n}`、`{time}` 等表示，翻译时保持占位符不变。
> - **器件结构沿用实验室惯用名称**：n-i-p → 正式结构；p-i-n → 反式结构。这里的“正式”不是误译，不改为“正置”。
> - 核心术语已于 2026-10-21 经用户确认定稿，正文使用以下统一名称；后续新增词条沿用这些约定。

## 核心术语定稿（2026-10-21）

本轮核心术语已确认，相关中文词条已统一。应用已接入中文 / English 切换与主要业务页面翻译；实现范围、保留原文的导出及开发约定见 [双语界面说明](bilingual-ui.md)。本清单仍需随页面更新维护，章节数量不代表全部动态消息的覆盖率。

### 已确认的表达规则

- 中文和英文界面均保留单位原文，不换算数值或单位，不改写大小写、上下标和符号。
- 化学药品名称、材料名称、化学式、商品名和缩写保留原文；“化学品”“溶剂”“气体”等类别及字段标签可以翻译。
- n-i-p 与 p-i-n 分别称“正式结构”和“反式结构”；J–V 的 Forward / Reverse 仍为“正向 / 反向”，两者不要混用。
- HTL、ETL、PCE、Voc、Jsc、FF、ALD、VCD 等缩写保留原文。
- 翻译仅影响显示文案；API 字段、枚举值、记录编号及用户填写的名称、备注保持原值。

### 核心名词与操作定稿

以下名称为本轮确定的术语；相关长句仍需在接入实际页面时核对语境与布局。

| English / 源码值 | 中文用词 | 校对说明 / 状态 |
|---|---|---|
| Experiment | 实验 | 沿用；与单次制备批次区分。 |
| Campaign | 实验系列 | 已确认；用稳定系列编号组织相关实验，不是人员组织。 |
| Fabrication batch | 制备批次 | 沿用；一次实际制备的执行与记录单位。 |
| Run sheet | 制备记录单 | 已确认；涵盖计划参数、实际记录和偏差。 |
| Baseline | 基线；首次说明可用“基线方案” | 沿用；指包含器件布局及各层配方、工艺的参考方案，不是统计基线。 |
| Layer preset | 层预设 | 沿用；指可复用的单层配方与工艺。 |
| Device layout | 器件布局 | 沿用；指基底尺寸、每片基底器件数、有效面积等。 |
| Substrate / Device | 基底 / 器件 | 沿用；设备预约中的 Equipment 为“设备”，不能译为“器件”。 |
| Condition | 实验条件；短标签可用“条件” | 沿用；指一套完整实验方案，不限于某个工艺参数。 |
| Control / Target | 对照条件 / 目标条件 | 沿用；短标签可用“对照 / 目标”。这里的 Target 不是溅射靶材。 |
| Standalone | 独立 | 沿用；按语境展开为“独立实验 / 独立条件”。 |
| Characterization / Result | 表征 / 结果 | 沿用。 |
| Assignment | 条件关联 | 已确认；将测量基底与实验条件对应。明确语境下的短标签可用“关联”。 |
| Exclusion | 排除 | 沿用；从分析中排除，原始测量记录仍保留，不等于删除。 |
| Deviation / Exception | 偏差 / 例外 | 沿用；实际执行偏离计划与申请例外许可是不同概念。 |
| Snapshot / Provenance | 快照 / 溯源 | 沿用；必要时解释为“当时保存的完整方案 / 来源与版本信息”。 |
| Revision / Version / Archive | 修订版 / 版本 / 归档 | 沿用；归档不等于删除。 |
| Scope / Shared / Personal | 范围 / 共享 / 个人 | 沿用；共享范围与访问权限另行说明。 |
| Release approved plan | 发布已批准计划 | 已确认；供制备使用的流程状态，不代表公开实验内容。 |
| Freeze fabrication batch | 创建制备批次 | 已确认；帮助文字说明“固定当前计划快照”，不是暂停批次。 |
| Stock dispersion | 原液 | 已确认；帮助文字说明为用于稀释的原始分散液，药品名称原文不变。 |
| Stock volume / Diluted dispersion | 原液体积 / 稀释分散液 | 与“原液”统一；体积单位保留 mL。 |
| Schema | 数据结构；版本标签用“数据结构版本” | 此处为数据格式及其版本，不是软件架构。 |

### 状态必须按对象翻译

| 源码值 | 对象 / 语境 | 中文显示 |
|---|---|---|
| `active` / `inactive` | 账户 | 已启用 / 已停用 |
| `active` / `inactive` | 材料、供应商产品、预设、基线 | 可用 / 已停用 |
| `active` / `closed` / `archived` | Campaign | 进行中 / 已关闭 / 已归档 |
| `pending` | 材料或供应商产品审核 | 待审核 |
| `pending` | 一般待办 | 待处理 |
| `pending_approval` / `approved` | 实验计划 | 待审批 / 已批准 |
| `released` | 实验计划 | 已发布；仅表示流程状态，不表示公开可见 |
| `planned` | 制备批次 / 设备预约 | 已计划 / 已预约 |
| `ready` / `running` / `in_progress` | 执行状态 | 就绪 / 运行中 / 进行中 |

后续词条按模块和语境设置稳定键，不能将相同英文单词强制绑定到同一个中文译文。以上名称已统一到本文相关词条及本轮接入的应用文案。

### 双语接入顺序与范围

1. 建立应用共用的中文 / English 切换和翻译资源，默认中文并记住用户选择；先接入登录、导航、公共按钮、状态及日期显示。切换语言时保留当前页面和未保存输入。
2. 将下列清单拆为按模块组织、键与占位符可核对的资源；逐步接入实验系列、实验计划、制备记录单、材料库、结果及分析页面，并覆盖校验、错误、空状态与无障碍标签。
3. 预约模块接入同一套语言机制；预约访问权限与 fabrication workflow 的访问权限分别控制。双语实现不自动授予任何业务权限。
4. 在相同演示数据下核对中英文页面、动态状态和布局，并验证语言切换不会清空草稿、单位及药品名称保持原文。论文图表、PDF 和其他导出文件的语言范围单独列明，不能仅凭界面切换认定它们已支持双语。

先完成本地检查，按仓库约定在准备合并时集中运行 Ubuntu 和 Windows CI；两项检查通过后再将对应内容同步至 internal 功能分支与 PR。

---

## 0. HTML 框架

| English | 中文 |
|---|---|
| Perovskite Solar Cell Fabrication Workflow (页面标题) | 钙钛矿太阳能电池制备工作流 |

## 1. 应用骨架 / 导航 / 全局

| English | 中文 |
|---|---|
| Loading… | 加载中… |
| Unable to verify your session | 无法验证您的会话 |
| The session service did not respond. | 会话服务未响应。 |
| Retry | 重试 |
| Not authorized | 无权访问 |
| Your account does not have permission to view this page. | 您的账户没有权限查看此页面。 |
| This page | 此页面 |
| Skip to main content | 跳到主要内容 |
| Perovskite Solar Cell / Fabrication Workflow（侧边栏品牌名） | 钙钛矿太阳能电池 / 制备工作流 |
| Laboratory（导航分组） | 实验室 |
| Overview | 总览 |
| Workflow guide | 流程指南 |
| Experiments | 实验 |
| Fabrication batches | 制备批次 |
| Results | 结果 |
| Analysis workbench | 分析工作台 |
| Library（导航分组） | 资源库 |
| Materials | 材料 |
| Layer presets | 层预设 |
| Baselines | 基线 |
| Device layouts | 器件布局 |
| Management（导航分组） | 管理 |
| Campaigns | 实验系列 |
| Users | 用户 |
| Becomes available in a later migration phase | 将在后续迁移阶段开放 |
| {label} becomes available in a later migration phase. | {label}将在后续迁移阶段开放。 |
| Log out / Logging out… | 退出登录 / 正在退出… |
| Unable to log out. | 无法退出登录。 |
| Workflow pipeline | 工作流流水线 |
| Plans / Fabrication / Characterization（流水线阶段） | 计划 / 制备 / 表征 |
| {n} released / {n} in progress | {n} 已发布 / {n} 进行中 |
| Unable to load pipeline counts. | 无法加载流水线计数。 |
| Retry counts | 重试计数 |
| Loading pipeline… | 正在加载流水线… |
| The count service did not respond. | 计数服务未响应。 |
| Dismiss notification | 关闭通知 |
| The application view crashed | 应用视图发生崩溃 |
| An unexpected error interrupted this page. Reload to recover; unsaved changes are lost. | 意外错误中断了此页面。重新加载可恢复；未保存的修改将丢失。 |
| Reload | 重新加载 |
| Something went wrong | 出现错误 |
| Loading records… / Loading records | 正在加载记录… / 加载记录 |
| No records. | 暂无记录。 |
| Confirm | 确认 |
| Cancel | 取消 |
| Fields marked * or required must be filled in before saving. Groups marked optional can be left empty or keep their defaults. | 标记 * 或"必填"的字段必须在保存前填写。标记"可选"的分组可留空或保留默认值。 |
| required / optional | 必填 / 可选 |
| {label} help | {label}帮助 |
| Enter a JSON object. Use {} when no structured specification is needed. | 请输入 JSON 对象。无需结构化规格时填写 {}。 |
| Specification must be a JSON object. | 规格必须是 JSON 对象。 |
| Specification must be valid JSON. | 规格必须是有效的 JSON。 |

## 2. 登录

| English | 中文 |
|---|---|
| Sign in | 登录 |
| Perovskite solar-cell fabrication workflow | 钙钛矿太阳能电池制备工作流 |
| Username | 用户名 |
| Password | 密码 |
| Signing in… | 正在登录… |
| Sign in failed. Please try again. | 登录失败，请重试。 |
| Unable to verify the current session. | 无法验证当前会话。 |

## 3. 总览（Overview）

| English | 中文 |
|---|---|
| Overview | 总览 |
| Laboratory activity at a glance. | 实验室动态一览。 |
| Finish the first-use setup | 完成首次使用设置 |
| No device layouts yet | 暂无器件布局 |
| An administrator creates the first device layout (substrate size, devices per substrate) under Device layouts. | 管理员在"器件布局"中创建第一个器件布局（基底尺寸、每基底器件数）。 |
| Ask an administrator to create the first device layout under Device layouts. | 请管理员在"器件布局"中创建第一个器件布局。 |
| Open device layouts | 打开器件布局 |
| No active campaign yet | 暂无进行中的实验系列 |
| Every experiment belongs to a campaign. Create the first active campaign under Campaigns. | 每个实验都归属于一个实验系列。请在"实验系列"中创建第一个进行中的实验系列。 |
| Ask an instructor to create the first active campaign under Campaigns. | 请导师在"实验系列"中创建第一个进行中的实验系列。 |
| Open campaigns | 打开实验系列 |
| Loading overview data… | 正在加载总览数据… |
| Unable to load overview data. | 无法加载总览数据。 |
| Pipeline board | 流水线看板 |
| Next actions | 待办事项 |
| No work needs attention right now. | 当前没有需要处理的工作。 |
| Assign {filename} | 关联 {filename} |
| Continue {batch_code} | 继续 {batch_code} |
| Start {batch_code} | 开始 {batch_code} |
| Prepare {batch_code} | 准备 {batch_code} |
| Upload results for {batch_code} | 上传 {batch_code} 的结果 |
| Approve {experiment_code} | 审批 {experiment_code} |
| Continue {experiment_code} | 继续 {experiment_code} |
| Release {experiment_code} | 发布 {experiment_code} |
| Freeze a batch for {experiment_code} | 为 {experiment_code} 创建制备批次 |
| Start fabrication for {experiment_code} | 开始 {experiment_code} 的制备 |
| Complete {experiment_code} | 完成 {experiment_code} |
| Assign substrate conditions to use this result in statistics and uniformity. | 将基底与实验条件关联，以便在统计和均匀性分析中使用该结果。 |
| Record fabrication steps and complete the run sheet. | 记录制备步骤并完成制备记录单。 |
| The run sheet is ready for fabrication. | 制备记录单已就绪，可开始制备。 |
| Finish the run sheet and mark the batch ready. | 完成制备记录单并将批次标记为就绪。 |
| Add the measurement CSV, then assign each substrate to its condition. | 添加测量 CSV，然后将每片基底与对应条件关联。 |
| Review the submitted plan before fabrication. | 制备前审查已提交的计划。 |
| Finish and submit the draft plan. | 完成并提交计划草稿。 |
| Release the approved plan before freezing a fabrication batch. | 创建制备批次前，先发布已批准计划。 |
| At least one active batch is required to start fabrication. | 开始制备至少需要一个活跃的批次。 |
| The plan has a fabrication batch and can enter the in-progress stage. | 该计划已有制备批次，可进入进行中阶段。 |
| All fabrication batches are terminal; finish the plan lifecycle. | 所有制备批次均已结束；请完成该计划的生命周期。 |
| Waiting for instructor approval before the plan can be released. | 等待导师审批后方可发布计划。 |
| Experiments（统计卡） | 实验 |
| Active campaigns（统计卡） | 进行中的实验系列 |
| Materials（统计卡） | 材料 |
| {n} experiments, view all experiments | {n} 个实验，查看全部实验 |
| View campaigns | 查看实验系列 |
| {n} materials, view all materials | {n} 种材料，查看全部材料 |
| Plan status | 计划状态 |
| No experiments yet. | 暂无实验。 |
| Start by planning your first comparative deposition experiment. | 从规划您的第一个对比沉积实验开始。 |
| Plan an experiment | 规划实验 |
| Recent experiments | 最近实验 |
| View all | 查看全部 |
| Experiment / Series / Plan / Status / Device stack / Updated（表头） | 实验 / 系列 / 计划 / 状态 / 器件堆叠 / 更新时间 |
| Planning / Approved / Fabrication / Characterization（看板列） | 规划中 / 已批准 / 制备中 / 表征中 |
| Experiment plan / Awaiting release / Batch created / Awaiting batch（卡片标题） | 实验计划 / 待发布 / 批次已创建 / 待建批次 |
| updated {time} / started {time} / completed {time} / uploaded {time} | 更新于 {time} / 开始于 {time} / 完成于 {time} / 上传于 {time} |
| Time unavailable | 时间不可用 |
| No records | 暂无记录 |
| Over 24 h | 超过 24 h |
| {x}% batch best forward PCE | {x}% 批次最佳正向 PCE |
| {total} records in the pipeline · amber text marks pending records older than 24 h | 流水线共 {total} 条记录 · 琥珀色文字标记超过 24 h 的待处理记录 |
| Batch unavailable | 批次不可用 |
| Experiment {id} | 实验 {id} |
| just now / {n} min ago / {n} h ago / {n} d ago | 刚刚 / {n} 分钟前 / {n} 小时前 / {n} 天前 |

## 4. 流程指南

| English | 中文 |
|---|---|
| Workflow guide | 流程指南 |
| A short path from an experiment plan to J-V results and figures. | 从实验计划到 J-V 结果与图表的简要路径。 |
| Start an experiment | 开始实验 |
| Before you begin | 开始之前 |
| Prepare the experiment context | 准备实验环境 |
| An active campaign and a device layout are required. Ask an instructor or administrator to prepare them if they are missing. | 需要一个进行中的实验系列和一个器件布局。如缺失，请导师或管理员准备。 |
| View campaigns / View device layouts | 查看实验系列 / 查看器件布局 |
| Process map | 流程图 |
| The full path at a glance | 全流程一览 |
| Enlarge diagram | 放大流程图 |
| Static overview. Use the linked steps below to continue in the application. | 静态总览。请通过下方链接步骤在应用中继续操作。 |
| Working SOP | 标准操作流程 |
| Follow these steps | 按以下步骤操作 |
| Plan · student / Review · instructor, then student / Fabricate · student / Characterize · student / Analyze · result page（阶段标签） | 规划 · 学生 / 审查 · 导师，然后学生 / 制备 · 学生 / 表征 · 学生 / 分析 · 结果页 |
| Create and submit a plan | 创建并提交计划 |
| Choose the campaign and device layout, define a control and target conditions, then review and save the complete recipe. Open the draft experiment and select Submit for approval. | 选择实验系列和器件布局，定义对照与目标条件，然后检查并保存完整配方。打开草稿实验并选择"提交审批"。 |
| Create experiment → | 创建实验 → |
| Approve and release the plan | 批准并发布计划 |
| An instructor or administrator reviews the conditions and selects Approve plan. The student then opens the approved experiment and selects Release approved plan. | 导师或管理员审查条件并选择"批准计划"。随后学生打开已批准的实验并选择"发布已批准计划"。 |
| Find the experiment → | 查找实验 → |
| Freeze a batch and record the work | 创建制备批次并记录工作 |
| On the experiment page, select Freeze fabrication batch before Start fabrication. In the batch run sheet, mark it ready, start execution, record actual preparations and processes, and complete the batch. Return to the experiment to complete fabrication when the work is finished. | 在实验页面，先选择"创建制备批次"再"开始制备"。在批次制备记录单中将其标记为就绪、开始执行、记录实际的溶液准备与工艺过程，并完成批次。工作完成后返回实验页面完成制备。 |
| Open fabrication batches → | 打开制备批次 → |
| Upload the J-V CSV | 上传 J-V CSV |
| Open the experiment's Characterization results section and select Upload results. Choose the batch that produced the devices, upload its CSV, and continue to the result. The batch must be in progress or completed. | 打开实验的"表征结果"部分并选择"上传结果"。选择产出这些器件的批次，上传其 CSV 并继续查看结果。批次须处于进行中或已完成状态。 |
| Choose an experiment → | 选择实验 → |
| Inspect curves, then compare groups | 查看曲线，再比较各组 |
| J-V curves are available immediately after upload. Assign every substrate to its condition group and save assignments before group statistics and uniformity. Device exclusions are optional; review both all-device and filtered figures, with forward and reverse scans kept separate. | 上传后即可查看 J-V 曲线。在分组统计和均匀性分析前，将每片基底与对应条件组关联并保存关联。器件排除为可选；请同时查看全器件与筛选后的图表，正向与反向扫描分开呈现。 |
| Open results → | 打开结果 → |

## 5. 实验列表

| English | 中文 |
|---|---|
| Loading experiments… | 正在加载实验… |
| Unable to load experiments. | 无法加载实验。 |
| Experiments | 实验 |
| Plans and records across all campaigns. | 跨所有实验系列的计划与记录。 |
| Plan new experiment | 规划新实验 |
| Experiment filters | 实验筛选 |
| Campaign | 实验系列 |
| All Campaigns | 全部实验系列 |
| Plan status | 计划状态 |
| All statuses | 全部状态 |
| Search experiments | 搜索实验 |
| Code, Campaign, or material | 编号、实验系列或材料 |
| {n} records | {n} 条记录 |
| Experiment records | 实验记录 |
| No experiments match these filters. | 没有符合筛选条件的实验。 |
| Experiment / Campaign / Plan type / Best PCE / Plan / Record / Device stack / Updated（表头） | 实验 / 实验系列 / 计划类型 / 最佳 PCE / 计划 / 记录 / 器件堆叠 / 更新时间 |

## 6. 实验详情

| English | 中文 |
|---|---|
| Submit for approval | 提交审批 |
| Approve plan | 批准计划 |
| Release approved plan | 发布已批准计划 |
| Start fabrication | 开始制备 |
| Complete fabrication | 完成制备 |
| Cancel plan | 取消计划 |
| Plan status changed to {status}. | 计划状态已变更为{status}。 |
| Unable to update the plan status. | 无法更新计划状态。 |
| Plan content changed after you loaded it. The latest version is shown below — review it again before approving. | 计划内容在您加载后已被修改。下方显示最新版本——请在批准前重新审查。 |
| No fabrication batches yet. Freeze at least one batch below before starting or completing fabrication — characterization CSV uploads require a batch. | 尚无制备批次。开始或完成制备前，请先在下方创建至少一个制备批次——表征 CSV 上传需要批次。 |
| Fabrication batch frozen from the approved condition snapshots. | 已根据已批准的条件快照创建制备批次，并固定计划快照。 |
| Unable to create the fabrication batch. | 无法创建制备批次。 |
| Invalid experiment / The experiment identifier is not valid. | 无效实验 / 实验标识符无效。 |
| Loading experiment… | 正在加载实验… |
| Unable to load experiment / The experiment could not be loaded. | 无法加载实验 / 实验加载失败。 |
| {plan_type} plan in {campaign_id}. | {campaign_id} 中的{plan_type}计划。 |
| Unclassified / unassigned Campaign | 未分类 / 未关联实验系列 |
| Updated {time} | 更新于 {time} |
| Export JSON / Export PDF / Back to records | 导出 JSON / 导出 PDF / 返回记录 |
| Plan summary | 计划摘要 |
| Plan actions | 计划操作 |
| Conditions | 条件 |
| Fabrication batches | 制备批次 |
| Batch notes | 批次备注 |
| Freeze fabrication batch | 创建制备批次 |
| No fabrication batches yet. | 尚无制备批次。 |
| Freeze a batch from the approved condition snapshots above — starting fabrication and CSV result uploads both require at least one batch. | 从上方已批准的条件快照创建制备批次——开始制备和 CSV 结果上传都至少需要一个批次。 |
| Release the plan before freezing execution records. | 创建制备批次并固定计划快照前，请先发布计划。 |
| No notes | 无备注 |
| Provenance | 溯源 |
| Characterization results | 表征结果 |
| Upload results | 上传结果 |
| No characterization results uploaded. | 尚未上传表征结果。 |
| View direction-specific statistics | 查看分方向统计 |
| Layout / Substrates / Devices / Source（事实标签） | 布局 / 基底 / 器件 / 来源 |
| {n} expected devices | 预期 {n} 个器件 |
| Baseline version {id} / Standalone snapshot | 基线版本 {id} / 独立快照 |
| Advanced: raw snapshots (JSON) | 高级：原始快照（JSON） |
| Complete condition snapshot / Device layout snapshot | 完整条件快照 / 器件布局快照 |
| Substrate exception | 基底例外 |
| manual review | 人工复核 |
| Decision note: {text} | 决定备注：{text} |
| Decision note for {name} | {name} 的决定备注 |
| Approve exception / Reject exception | 批准例外 / 驳回例外 |
| Exception reason for {name} | {name} 的例外原因 |
| Request exception | 申请例外 |
| No active exception is recorded. | 当前无生效的例外记录。 |
| Unable to request the substrate exception. / Unable to record the exception decision. | 无法申请基底例外。/ 无法记录例外决定。 |
| Substrate exception for {name} | {name} 的基底例外 |
| Condition comparison | 条件对比 |
| layers in fabrication order · identical layers collapsed | 按制备顺序排列的层 · 相同层已折叠 |
| identical / {n} difference / {n} differences | 相同 / {n} 处差异 / {n} 处差异 |
| reference | 参考 |
| Substrate / Junction / Bandgap / Layer sequence | 基底 / 结型 / 带隙 / 层序列 |
| Name / Solution / Process | 名称 / 溶液 / 工艺 |
| Method / Spin step {n} / VCD stage {n} / Gas backfill {n} / VCD sequence / Anneal step {n} | 方法 / 旋涂步骤 {n} / VCD 阶段 {n} / 气体回填 {n} / VCD 顺序 / 退火步骤 {n} |
| Mode / Power / Pressure / Gas 1 / Gas 2 / Duration / Thickness / Rate / Substrate temp / ALD cycles | 模式 / 功率 / 压强 / 气体 1 / 气体 2 / 时长 / 厚度 / 速率 / 基底温度 / ALD 循环数 |
| Dispersion: / Solids: / Solvents: | 分散液：/ 固体：/ 溶剂： |
| Parameter | 参数 |
| Junction / Bandgap / Recipe schema / Perovskite process | 结型 / 带隙 / 配方数据结构 / 钙钛矿工艺 |
| Not recorded | 未记录 |

## 7. 实验构建器

| English | 中文 |
|---|---|
| 01 Starting point / 02 Substrate / 03 Layer stack / 04 Conditions / 05 Review | 01 起点 / 02 基底 / 03 层堆叠 / 04 条件 / 05 检查 |
| Experiment planning steps | 实验规划步骤 |
| Loading experiment-planning catalogs… | 正在加载实验规划目录… |
| Unable to load the planning workspace / The reusable directories did not respond. | 无法加载规划工作区 / 可复用目录未响应。 |
| Plan experiment | 规划实验 |
| Build a complete, independently reconstructible fabrication plan from versioned reusable inputs. | 从带版本的可复用输入构建完整、可独立复现的制备计划。 |
| Unsaved draft | 未保存草稿 |
| {name} · expanded baseline version {id} | {name} · 展开的基线版本 {id} |
| Draft restored from your last editing session. Your entered values are kept until you save or discard them. | 已恢复您上次编辑的草稿。所填内容将保留，直到您保存或放弃。 |
| Discard draft | 放弃草稿 |
| Current stack | 当前堆叠 |
| {n} layers | {n} 层 |
| Substrate | 基底 |
| Current device stack | 当前器件堆叠 |
| Complete each step, then review the plan before saving. | 完成各步骤，然后在保存前检查计划。 |
| All required planning values are complete. | 所有必填规划值已完成。 |
| {n} review items remain. | 还剩 {n} 项待检查。 |
| Review | 检查 |
| Saving… / Save experiment | 保存中… / 保存实验 |
| Complete the review items before saving this experiment. | 保存实验前请完成待检查项。 |
| Experiment saved with complete expanded snapshots. | 实验已保存，含完整展开快照。 |
| Unable to save the experiment. | 无法保存实验。 |
| Replace current draft? | 替换当前草稿？ |
| Selecting a different starting point replaces the draft you are editing, including any recorded layers, conditions, and process values. This cannot be undone. | 选择不同的起点将替换您正在编辑的草稿，包括已记录的层、条件和工艺值。此操作不可撤销。 |
| Discard edits and replace | 放弃修改并替换 |
| No device layout is available for this baseline. | 此基线没有可用的器件布局。 |
| Unable to expand the selected baseline. | 无法展开所选基线。 |
| Unable to apply the layout. | 无法应用该布局。 |
| Step 1 / Step 2 / Step 3 / Step 4 / Step 5 | 步骤 1 / 步骤 2 / 步骤 3 / 步骤 4 / 步骤 5 |
| Starting point | 起点 |
| Expanded snapshot | 展开快照 |
| Three ways to begin: expand a baseline (the shortcut — its complete recipe is copied into this editable plan), or plan from scratch and fill in every layer, material, and process yourself. Either way the experiment stores its own complete snapshot; a baseline reference is provenance only. | 三种开始方式：展开基线（捷径——其完整配方将复制到本可编辑计划中），或从零规划，自行填写每层、每种材料和工艺。无论哪种方式，实验都会保存自己的完整快照；基线引用仅作溯源。 |
| Campaign | 实验系列 |
| Choose an active Campaign… | 请选择一个进行中的实验系列… |
| Baseline reference (optional shortcut) | 基线引用（可选捷径） |
| Changing this selection replaces the current editable recipe with a fresh deep copy. Leave empty to plan from scratch. | 更改此选项会用所选基线的独立副本替换当前可编辑配方。留空则从零规划。 |
| No baselines available yet — plan from scratch below | 暂无可用基线——请在下方从零规划 |
| Choose an active baseline… | 请选择一个可用基线… |
| {name} · revision {n} | {name} · 修订版 {n} |
| Plan from scratch / Start blank | 从零规划 / 空白开始 |
| Blank plan active | 空白计划已激活 |
| Substrate and device layout | 基底与器件布局 |
| Supplier products come from the reusable material directory. A layout controls substrate dimensions and expected device counts. | 供应商产品来自可复用材料目录。布局决定基底尺寸与预期器件数。 |
| Substrate material | 基底材料 |
| Choose a material… | 请选择材料… |
| {name} (pending review) | {name}（待审核） |
| Supplier product | 供应商产品 |
| Choose a supplier product… | 请选择供应商产品… |
| {vendor} · {catalog_number} | {vendor} · {catalog_number} |
| Device layout | 器件布局 |
| Choose a layout… | 请选择布局… |
| {description} · {w} × {l} mm | {description} · {w} × {l} mm |
| Footprint / Devices per substrate / Catalog source | 外形尺寸 / 每基底器件数 / 目录来源 |
| Not selected | 未选择 |
| Functional layer stack | 功能层堆叠 |
| Adding or replacing a preset copies its complete values into this draft. Later preset revisions cannot alter the saved experiment. | 添加或替换预设会将其完整值复制到本草稿。之后的预设修订不会改变已保存的实验。 |
| Device architecture | 器件结构 |
| p-i-n (inverted: HTL on substrate) / n-i-p (regular: ETL on substrate) | p-i-n（反式：HTL 在基底上）/ n-i-p（正式：ETL 在基底上） |
| Sets the deposition role order. Switching re-sorts the stack; within-role material order is preserved. | 设定沉积角色顺序。切换会重新排序堆叠；同角色内的材料顺序保持不变。 |
| Layer preset | 层预设 |
| Choose an active preset… | 请选择一个可用预设… |
| {name} · {layer_type} · {scope} | {name} · {layer_type} · {scope} |
| Add copied preset | 添加复制的预设 |
| New blank layer | 新建空白层 |
| Choose a layer type… | 请选择层类型… |
| {label} · {role} | {label} · {role} |
| Add blank layer | 添加空白层 |
| A blank layer starts with no solution and no process — add them via "Edit complete layer values". Presets are a shortcut, not a requirement. | 空白层初始没有溶液和工艺——请通过"编辑完整层值"添加。预设是捷径，不是必需。 |
| Layers of the same material type can be resequenced by dragging the handle; different materials retain the required device order. | 同材料类型的层可拖动手柄重新排序；不同材料保持器件所需顺序。 |
| No layers yet. Add copied presets or blank layers; they are placed in the required device order. | 暂无层。添加复制的预设或空白层；它们会按器件所需顺序放置。 |
| Drag to reorder | 拖动以重新排序 |
| copied from {preset_id} | 复制自 {preset_id} |
| Perovskite process incomplete — open "Edit complete layer values" and fill in every vacuum stage. | 钙钛矿工艺不完整——请打开"编辑完整层值"并填写每个真空阶段。 |
| Layer values incomplete — open "Edit complete layer values" and fill in the missing process or solution values. | 层值不完整——请打开"编辑完整层值"并填写缺失的工艺或溶液值。 |
| Move {name} up / Move {name} down | 上移 {name} / 下移 {name} |
| Remove | 移除 |
| Edit complete layer values | 编辑完整层值 |
| Layer name | 层名称 |
| Replace from same-type preset | 从同类型预设替换 |
| Keep current expanded values | 保留当前展开值 |
| Spin stages | 旋涂阶段 |
| Add spin stage | 添加旋涂阶段 |
| Stage {n} speed (rpm) / Duration (s) / Acceleration (rpm/s) | 阶段 {n} 转速 (rpm) / 时长 (s) / 加速度 (rpm/s) |
| Annealing stages | 退火阶段 |
| Add annealing stage | 添加退火阶段 |
| Stage {n} temperature (°C) | 阶段 {n} 温度 (°C) |
| No layer process is recorded. | 未记录层工艺。 |
| Add process | 添加工艺 |
| Layer process | 层工艺 |
| Remove process | 移除工艺 |
| This layer process is not complete yet. / Fill in the missing values below — the save button unlocks once every stage is complete. | 该层工艺尚不完整。/ 请在下方填写缺失值——所有阶段完成后保存按钮才会解锁。 |
| Method | 方法 |
| Spin coating / Sputtering / Thermal evaporation / Atomic layer deposition | 旋涂 / 磁控溅射 / 热蒸发 / 原子层沉积 |
| Sputter mode | 溅射模式 |
| RF / DC / Pulsed DC | RF / DC / 脉冲 DC |
| Power (W) / Pressure (Pa) / Gas 1 / Gas 1 flow (sccm) / Gas 2 (optional) / Gas 2 flow (sccm) / Duration (s) | 功率 (W) / 压强 (Pa) / 气体 1 / 气体 1 流量 (sccm) / 气体 2（可选）/ 气体 2 流量 (sccm) / 时长 (s) |
| Thickness (nm) / Rate (Å/s) | 厚度 (nm) / 速率 (Å/s) |
| Substrate temperature (°C) / Cycles | 基底温度 (°C) / 循环数 |
| Perovskite deposition process | 钙钛矿沉积工艺 |
| The ordered spin, vacuum/gas-backfill, and annealing stages are stored as a complete snapshot. | 有序的旋涂、真空/气体回填与退火阶段将作为完整快照保存。 |
| This perovskite process is not complete yet. / Fill in the highlighted stages below — the save button unlocks once every stage is complete. | 该钙钛矿工艺尚不完整。/ 请填写下方高亮阶段——所有阶段完成后保存按钮才会解锁。 |
| Vacuum and gas-backfill program | 真空与气体回填程序 |
| How to record the VCD program | 如何记录 VCD 程序 |
| Rows run in order. Up to five evacuate rows and five gas-backfill rows. | 各行按顺序执行。最多五行抽真空和五行气体回填。 |
| Evacuate — valve, pressure (integer Pa), and hold time (whole seconds; 0 s = reach the pressure and move on without holding). | 抽真空——阀门、压强（整数 Pa）和保持时间（整数秒；0 s = 到达压强后即继续，不保持）。 |
| Pump to base vacuum (pressure not controlled) — set the pressure to 0 and record the total pump time. | 抽至本底真空（不控制压强）——压强设为 0 并记录总抽气时间。 |
| Multi-pressure holding — add one row per setpoint; the valve may change between rows (for example VV03 pumps fast and can overshoot a setpoint, so VV03 to reach it then VV06 to hold it). | 多段压强保持——每个设定点加一行；行间可更换阀门（例如 VV03 抽速快易过冲设定点，可先用 VV03 到达，再用 VV06 保持）。 |
| Gas backfill — gas, MFC flow (integer sccm), target pressure (Pa), and hold time (s; 0 = no hold). The fill time itself is not recorded. | 气体回填——气体、MFC 流量（整数 sccm）、目标压强 (Pa) 和保持时间 (s；0 = 不保持)。充气时间本身不记录。 |
| Add stage | 添加阶段 |
| At least one evacuation row is required. Gas-backfill rows are optional — add them only if your program includes a gas backfill. | 至少需要一行抽真空。气体回填行可选——仅当程序包含气体回填时添加。 |
| Stage {n} | 阶段 {n} |
| Evacuate / Gas backfill | 抽真空 / 气体回填 |
| Valve / Pressure (Pa) / Duration (s) / Gas / Flow (sccm) / Target pressure (Pa) / Hold time (s) | 阀门 / 压强 (Pa) / 时长 (s) / 气体 / 流量 (sccm) / 目标压强 (Pa) / 保持时间 (s) |
| — select a valve — | — 请选择阀门 — |
| No solution formulation is recorded for this layer. | 该层未记录溶液配方。 |
| Add solution formulation | 添加溶液配方 |
| Solution formulation | 溶液配方 |
| Remove formulation | 移除配方 |
| Formulation type | 配方类型 |
| Weighed solids / Diluted dispersion | 称量固体 / 稀释分散液 |
| Stock dispersion / Stock volume (mL) | 原液 / 原液体积 (mL) |
| Solid ingredients | 固体成分 |
| Add solid | 添加固体 |
| Chemical {n} / Weight (mg) | 化学品 {n} / 质量 (mg) |
| Remove solid {n} | 移除固体 {n} |
| Solvents | 溶剂 |
| Add solvent | 添加溶剂 |
| Solvent {n} / Volume (mL) | 溶剂 {n} / 体积 (mL) |
| Remove solvent {n} | 移除溶剂 {n} |
| Experiment conditions | 实验条件 |
| Add target | 添加目标 |
| Plan type | 计划类型 |
| Comparative / Standalone | 对比 / 独立 |
| Target conditions begin as deep copies. Each target retains its own complete editable stack and process snapshot. | 新增目标条件会复制对照方案，并保留完整的层堆叠与工艺快照，之后可独立修改。 |
| Each target retains a complete editable layer stack and perovskite process, independent of the control. | 每个目标保留完整可编辑的层堆叠与钙钛矿工艺，独立于对照。 |
| Layer {n} · {name} | 层 {n} · {name} |
| Remove target | 移除目标 |
| Condition name | 条件名称 |
| Choose a matching layout… | 请选择匹配的布局… |
| Planned substrates | 计划基底数 |
| Expected devices: | 预期器件数： |
| Edit complete independent target snapshot | 编辑完整独立目标快照 |
| Change plan type | 更改计划类型 |
| Switching to {type} rebuilds the condition list and discards these condition-specific edits: | 切换到{type}将重建条件列表并放弃以下条件特定的修改： |
| Discard edits and switch | 放弃修改并切换 |
| Unable to update the experiment conditions. | 无法更新实验条件。 |
| Review complete plan | 检查完整计划 |
| Ready to save / {n} items need attention | 可以保存 / {n} 项待处理 |
| Complete these values before saving | 保存前请完成以下内容 |
| Campaign / Starting point / Baseline version / Setup mode | 实验系列 / 起点 / 基线版本 / 设置方式 |
| Not selected / Blank plan / None | 未选择 / 空白计划 / 无 |
| Substrate / Ordered functional layers / Perovskite process / Condition plan | 基底 / 有序功能层 / 钙钛矿工艺 / 条件计划 |
| No supplier / No catalog number | 无供应商 / 无货号 |
| Spin stages / VCD stages / Gas backfills / Annealing stages / VCD sequence | 旋涂阶段 / VCD 阶段 / 气体回填 / 退火阶段 / VCD 顺序 |
| Not recorded | 未记录 |
| Condition / Role / Layout / Substrates / Expected devices / Snapshot（表头） | 条件 / 角色 / 布局 / 基底 / 预期器件 / 快照 |
| Complete independent copy / Primary recipe | 完整独立副本 / 主配方 |
| Control / Target 1 / Target {n} / Standalone condition（默认条件名） | 对照 / 目标 1 / 目标 {n} / 独立条件 |

### 校验与错误消息

| English | 中文 |
|---|---|
| Enter a layer name. | 请输入层名称。 |
| {name} requires a layer process. | {name} 需要层工艺。 |
| {name} does not support {method}. | {name} 不支持{method}。 |
| {name} requires a solution formulation. | {name} 需要溶液配方。 |
| {name} does not use a solution formulation with {method}. | {name} 在{method}下不使用溶液配方。 |
| {name} requires a stock dispersion name and volume. | {name} 需要原液名称和体积。 |
| {name} requires at least one solid ingredient. | {name} 至少需要一种固体成分。 |
| {name} has an incomplete solid ingredient. | {name} 有未填完整的固体成分。 |
| {name} requires at least one solvent. | {name} 至少需要一种溶剂。 |
| {name} has an incomplete solvent ingredient. | {name} 有未填完整的溶剂成分。 |
| {label} requires one to three spin stages. | {label} 需要一到三个旋涂阶段。 |
| {label} has an incomplete spin step. | {label} 有未填完整的旋涂步骤。 |
| {label} has an incomplete annealing stage. | {label} 有未填完整的退火阶段。 |
| {label} has an incomplete sputtering process. | {label} 有未填完整的溅射工艺。 |
| {label} requires gas 2 and its flow rate together. | {label} 的气体 2 与其流量需同时填写。 |
| {label} has an incomplete thermal-evaporation process. | {label} 有未填完整的热蒸发工艺。 |
| {label} has an incomplete ALD process. | {label} 有未填完整的 ALD 工艺。 |
| Record one to four complete {label} spin stages. | 记录一到四个完整的{label}旋涂阶段。 |
| Every {label} spin stage must be complete. | 每个{label}旋涂阶段都必须完整。 |
| Record one to five VCD evacuation stages. | 记录一到五个 VCD 抽真空阶段。 |
| Every VCD evacuation stage must be complete. | 每个 VCD 抽真空阶段都必须完整。 |
| Record at most five gas-backfill stages. | 最多记录五个气体回填阶段。 |
| Every gas-backfill stage must be complete. | 每个气体回填阶段都必须完整。 |
| Record one or two complete annealing stages. | 记录一到两个完整的退火阶段。 |
| Every annealing stage must be complete. | 每个退火阶段都必须完整。 |
| The VCD sequence must include every evacuation and gas-backfill stage exactly once. | VCD 顺序必须恰好包含每个抽真空和气体回填阶段一次。 |
| Select an active Campaign. | 请选择一个进行中的实验系列。 |
| Select a substrate material from the reusable directory. | 请从可复用目录中选择基底材料。 |
| Select a substrate supplier product. | 请选择基底供应商产品。 |
| Select a substrate catalog number. | 请选择基底货号。 |
| Record positive substrate dimensions. | 请填写正的基底尺寸。 |
| Add the complete functional layer stack. | 请添加完整的功能层堆叠。 |
| The device stack requires a {role} layer. | 器件堆叠需要一个 {role} 层。 |
| The ETL stack requires C60. | ETL 堆叠需要 C60。 |
| The ETL stack requires exactly one of BCP or SnO2. | ETL 堆叠需要 BCP 或 SnO2 之一。 |
| Create the required standalone or comparative conditions. | 请创建所需的独立或对比条件。 |
| {name} requires a device layout. | {name} 需要器件布局。 |
| {name} requires at least one substrate. | {name} 至少需要一片基底。 |
| {name} requires a complete independent layer stack. | {name} 需要完整的独立层堆叠。 |
| Only an active baseline with a complete deposition process can be expanded. | 只有具有完整沉积工艺的可用基线才能展开。 |
| {name} may appear only once in the device stack. | {name} 在器件堆叠中只能出现一次。 |
| The device stack must contain exactly one of BCP or SnO2. | 器件堆叠必须恰好包含 BCP 或 SnO2 之一。 |
| Unknown layer index. | 未知的层索引。 |
| The selected device layout has invalid substrate dimensions. | 所选器件布局的基底尺寸无效。 |
| Only an active layer preset can be expanded. | 只有可用的层预设才能展开。 |
| Unknown layer type. | 未知的层类型。 |
| The layer cannot be moved beyond the device stack. | 层不能移出器件堆叠范围。 |
| Layers can move only within the same functional role. | 层只能在同一功能角色内移动。 |
| Different materials must retain the required order within their functional role. | 不同材料必须保持其功能角色内的既定顺序。 |
| Unknown condition index. | 未知的条件索引。 |
| Targets can be added only to a comparative plan. | 目标只能添加到对比计划中。 |
| An experiment may contain at most 21 conditions. | 一个实验最多包含 21 个条件。 |
| Only a target condition can be removed. | 只能移除目标条件。 |
| A comparative plan requires at least one target condition. | 对比计划至少需要一个目标条件。 |

## 8. 制备批次列表

| English | 中文 |
|---|---|
| Loading fabrication batches… | 正在加载制备批次… |
| Unable to load fabrication batches / The fabrication batches could not be loaded. | 无法加载制备批次 / 制备批次加载失败。 |
| Unable to refresh fabrication batches: {err} The displayed results may not match the selected filter. | 无法刷新制备批次：{err} 显示的结果可能与所选筛选不符。 |
| Fabrication batches | 制备批次 |
| Fabrication batches across all campaigns, newest first. | 跨所有实验系列的制备批次，最新在前。 |
| Batch records | 批次记录 |
| Batch status | 批次状态 |
| All statuses | 全部状态 |
| draft / ready / in progress / completed / cancelled | 草稿 / 就绪 / 进行中 / 已完成 / 已取消 |
| No fabrication batches yet. / Fabrication batches appear here once a plan is released and a batch is frozen. | 尚无制备批次。/ 计划发布并创建制备批次后，制备批次将显示在此处。 |
| Best PCE {x} % · Jsc {y} mA/cm² | 最佳 PCE {x} % · Jsc {y} mA/cm² |
| No measured results yet. | 暂无测量结果。 |
| No batch notes. | 无批次备注。 |
| Created {time} | 创建于 {time} |

## 9. 批次详情（制备记录单）

| English | 中文 |
|---|---|
| Mark ready | 标记为就绪 |
| Start execution | 开始执行 |
| Complete batch | 完成批次 |
| Cancel batch | 取消批次 |
| Batch status changed to {status}. | 批次状态已变更为{status}。 |
| Unable to update the batch status. | 无法更新批次状态。 |
| Invalid batch / The fabrication batch identifier is not valid. | 无效批次 / 制备批次标识符无效。 |
| Batch not found / The batch does not belong to the requested experiment. | 未找到批次 / 该批次不属于所请求的实验。 |
| Loading run sheet… | 正在加载制备记录单… |
| Unable to load run sheet / The run sheet could not be loaded. | 无法加载制备记录单 / 制备记录单加载失败。 |
| Unable to refresh run sheet / Unable to refresh the run sheet. The displayed data may be outdated; verify the current batch state before continuing. | 无法刷新制备记录单 / 无法刷新制备记录单。显示的数据可能已过期；继续前请核实当前批次状态。 |
| Solution preparation saved. / Process execution saved. | 溶液准备已保存。/ 工艺执行已保存。 |
| Unable to save the preparation. / Unable to save the execution. | 无法保存准备记录。/ 无法保存执行记录。 |
| Recorded {n} run-sheet items as planned. | 已将制备记录单中的 {n} 个条目按计划记录。 |
| Unable to record the run sheet as planned. | 无法按计划记录制备记录单。 |
| Split saved. / Preparations merged. / Executions merged. | 拆分已保存。/ 准备已合并。/ 执行已合并。 |
| Unable to split the preparation. / Unable to split the execution. / Unable to merge the preparations. / Unable to merge the executions. | 无法拆分准备。/ 无法拆分执行。/ 无法合并准备。/ 无法合并执行。 |
| Deviation recorded. | 偏差已记录。 |
| Unable to record the deviation. | 无法记录偏差。 |
| Fabrication batch {n} · frozen condition snapshot | 制备批次 {n} · 已固定的条件快照 |
| Created {time} · Updated {time} | 创建于 {time} · 更新于 {time} |
| Export JSON / Export PDF / Back to plan | 导出 JSON / 导出 PDF / 返回计划 |
| Batch status | 批次状态 |
| Recorded {x}/{y} preparations · {a}/{b} executions | 已记录 {x}/{y} 项准备 · {a}/{b} 项执行 |
| Record all as planned ({n}) | 全部按计划记录（{n}） |
| Record all as planned | 全部按计划记录 |
| Record all {n} unrecorded run-sheet items as matching the plan? Each item copies its planned parameters as the actual record; items you already adjusted are untouched. | 将制备记录单中 {n} 个尚未记录的条目全部按计划填写？每项将复制其计划参数作为实际记录；您已调整的项目不受影响。 |
| Cancel batch {code}? Cancellation is final and the run sheet cannot be reopened. | 取消批次 {code}？取消为最终操作，制备记录单无法重新打开。 |
| Merge preparation | 合并准备 |
| Merge {source} into {target}? The source preparation will be merged and deleted. | 将 {source} 合并到 {target}？源准备将被合并并删除。 |
| Merge execution | 合并执行 |
| Merge {source} into {target}? The source execution will be merged and deleted. | 将 {source} 合并到 {target}？源执行将被合并并删除。 |
| condition {name} needs a valid actual substrate count | 条件 {name} 需要有效的实际基底数量 |
| condition {name} needs a deviation reason for its shortfall | 条件 {name} 需要为其数量不足填写偏差原因 |
| Run sheet sections / Jump to | 制备记录单分区 / 跳转至 |
| Preparations ({x}/{y}) / Executions ({x}/{y}) / Deviations ({n}) / Conditions / Substrates | 准备（{x}/{y}）/ 执行（{x}/{y}）/ 偏差（{n}）/ 条件 / 基底 |
| Frozen conditions | 已固定的条件 |
| Code / Name / Role / Layout / Substrates / Devices（表头） | 编号 / 名称 / 角色 / 布局 / 基底 / 器件 |
| Substrates & devices | 基底与器件 |
| {n} substrates | {n} 片基底 |
| Mark / Substrate / Status / Devices（表头） | 标记 / 基底 / 状态 / 器件 |
| {n} devices | {n} 个器件 |
| Run sheet | 制备记录单 |
| {x} preparations · {y} executions | {x} 项准备 · {y} 项执行 |
| Nothing to record on this run sheet yet. | 此制备记录单暂无可记录内容。 |
| Advanced: split, merge, and full recording forms | 高级：拆分、合并与完整记录表单 |
| Deviations | 偏差 |
| No deviations recorded. | 未记录偏差。 |
| # / Category / Type / Severity / Description / Recorded（表头） | # / 类别 / 类型 / 严重程度 / 描述 / 记录时间 |
| Complete batch | 完成批次 |
| Record how many substrates were actually made in each condition. A count below the planned number needs a deviation reason and counts of zero mean the whole group was abandoned. | 记录每个条件实际产出的基底数量。低于计划数需填写偏差原因；为零表示该组整体放弃。 |
| {code} · planned {n} | {code} · 计划 {n} |
| Actual substrates | 实际基底数 |
| Enter how many substrates were actually made. | 请输入实际产出的基底数量。 |
| Deviation reason (required) | 偏差原因（必填） |
| Step / Detail / Status — click to cycle（表头） | 步骤 / 详情 / 状态——点击切换 |
| Run sheet checklist | 制备记录单清单 |
| Solution preparations / Process executions | 溶液准备 / 工艺执行 |
| not recorded | 未记录 |
| Deviation | 偏差 |
| Record deviation | 记录偏差 |
| {code} · {title} | {code} · {title} |
| Category | 类别 |
| process / material / equipment / substrate / device / operator / other | 工艺 / 材料 / 设备 / 基底 / 器件 / 操作者 / 其他 |
| Severity | 严重程度 |
| info / warning / error / critical | 提示 / 警告 / 错误 / 严重 |
| What changed | 变更内容 |
| e.g. spin speed 4000 rpm instead of 5000 rpm | 例如转速 4000 rpm 而非 5000 rpm |
| Describe what changed. | 请描述变更内容。 |
| Unable to save the deviation. | 无法保存偏差。 |
| Saving… / Save deviation | 保存中… / 保存偏差 |
| planned / preparing / ready / consumed / running / completed / discarded / cancelled / failed | 已计划 / 准备中 / 就绪 / 已消耗 / 运行中 / 已完成 / 已废弃 / 已取消 / 失败 |
| Category / Severity / Type / Target / Description / Planned value (JSON) / Actual value (JSON) | 类别 / 严重程度 / 类型 / 对象 / 描述 / 计划值（JSON）/ 实际值（JSON） |
| general / fabrication_shortfall / measurement_shortfall | 一般 / 制备不足 / 测量不足 |
| Whole batch / Preparation {code} / Execution {code} / Substrate {code} / Device {code} / Condition {code} | 整个批次 / 准备 {code} / 执行 {code} / 基底 {code} / 器件 {code} / 条件 {code} |
| Process execution {code} | 工艺执行 {code} |
| Recorded / Not yet | 已记录 / 未记录 |
| Status | 状态 |
| Keep current | 保持当前 |
| Equipment identifier / Notes | 设备编号 / 备注 |
| Save execution | 保存执行 |
| Split execution ▲/▼ | 拆分执行 ▲/▼ |
| substrate {id}, layer {n} | 基底 {id}，层 {n} |
| Split | 拆分 |
| Merge into this execution | 合并到此执行 |
| Select a source execution | 选择源执行 |
| Merge | 合并 |
| Solution preparation {code} | 溶液准备 {code} |
| Save preparation | 保存准备 |
| Split preparation ▲/▼ | 拆分准备 ▲/▼ |
| condition {id}, layer {n} | 条件 {id}，层 {n} |
| Merge into this preparation | 合并到此准备 |
| Select a source preparation | 选择源准备 |
| Actual recording | 实际记录 |
| Not recorded yet / Recorded as planned / Record adjusted parameters | 尚未记录 / 按计划记录 / 记录调整后的参数 |
| Planned value must be valid JSON / Actual value must be valid JSON | 计划值必须是有效 JSON / 实际值必须是有效 JSON |

### 快照编辑器字段标签（SnapshotEditor）

| English | 中文 |
|---|---|
| Method / Formulation type / Stock dispersion / Stock volume / Chemical / Weight / Solvent / Volume | 方法 / 配方类型 / 原液 / 原液体积 / 化学品 / 质量 / 溶剂 / 体积 |
| Speed / Duration / Acceleration / Temperature / Valve / Pressure / Gas / Flow / Target pressure / Hold time | 转速 / 时长 / 加速度 / 温度 / 阀门 / 压强 / 气体 / 流量 / 目标压强 / 保持时间 |
| Sputter mode / Power / Gas 1 / Gas 1 flow / Gas 2 / Gas 2 flow / Thickness / Rate / Substrate temperature / Cycles | 溅射模式 / 功率 / 气体 1 / 气体 1 流量 / 气体 2 / 气体 2 流量 / 厚度 / 速率 / 基底温度 / 循环数 |
| Solid ingredients / Solvents / Spin-coating steps / Annealing steps / Evacuation stages / Gas backfill stages / VCD execution order | 固体成分 / 溶剂 / 旋涂步骤 / 退火步骤 / 抽真空阶段 / 气体回填阶段 / VCD 执行顺序 |
| Select valve | 请选择阀门 |
| {singular} {n}（如 Solid 1） | {名称} {n}（如 固体 1） |
| + Add {singular} | + 添加{名称} |
| Evacuate (stage {n}) / Gas backfill (stage {n}) | 抽真空（阶段 {n}）/ 气体回填（阶段 {n}） |

## 10. 上传结果

| English | 中文 |
|---|---|
| Upload characterization result | 上传表征结果 |
| Read devices from a JV CSV and continue to the assignment step. | 从 J-V CSV 读取器件并继续关联步骤。 |
| Back to plan | 返回计划 |
| Expected groups | 预期分组 |
| No eligible fabrication batches. / Start a fabrication batch and mark it in progress before uploading results. | 没有符合条件的制备批次。/ 上传结果前请先开始一个制备批次并标记为进行中。 |
| Result file | 结果文件 |
| Fabrication batch | 制备批次 |
| Choose the batch that produced these devices… | 请选择产出这些器件的批次… |
| {batch_code} ({status}) | {batch_code}（{status}） |
| CSV result file | CSV 结果文件 |
| Maximum size 10 MB. The server re-validates size, type, and integrity. | 最大 10 MB。服务器将重新校验大小、类型与完整性。 |
| Reading devices… / Read devices and continue | 正在读取器件… / 读取器件并继续 |
| Choose a CSV result file before submitting. | 提交前请选择 CSV 结果文件。 |
| Result file must not exceed 10 MB. Choose a smaller file. | 结果文件不得超过 10 MB。请选择更小的文件。 |
| Choose the fabrication batch that produced these devices. | 请选择产出这些器件的制备批次。 |
| Result uploaded. Assigning devices to conditions… | 结果已上传。正在将器件与条件关联… |
| Unable to upload the result file. | 无法上传结果文件。 |

## 11. 结果列表

| English | 中文 |
|---|---|
| Loading results… | 正在加载结果… |
| Unable to load results / The results could not be loaded. | 无法加载结果 / 结果加载失败。 |
| Unable to refresh results: {err} The displayed rows may not match the selected filter. | 无法刷新结果：{err} 显示的行可能与所选筛选不符。 |
| Results | 结果 |
| Uploaded result files across all campaigns, newest first. | 跨所有实验系列的上传结果文件，最新在前。 |
| Result records | 结果记录 |
| Experiment / Batch（筛选标签） | 实验 / 批次 |
| Experiment id / Fabrication batch id（占位符） | 实验 ID / 制备批次 ID |
| No characterization results. / Uploaded result files appear here once an in-progress batch is characterized. | 暂无表征结果。/ 进行中的批次完成表征后，上传的结果文件将显示在此处。 |
| Assigned / Unassigned | 已关联 / 未关联 |
| {n} bytes / Schema v{n} | {n} bytes / 数据结构版本 v{n} |

## 12. 结果详情 / 分析

| English | 中文 |
|---|---|
| Invalid result / The result identifier is not valid. | 无效结果 / 结果标识符无效。 |
| Loading result… | 正在加载结果… |
| Unable to load result / The result could not be loaded. | 无法加载结果 / 结果加载失败。 |
| Result file {id} · {content_type} | 结果文件 {id} · {content_type} |
| Uploaded {time} | 上传于 {time} |
| Experiment / Batch（头部按钮） | 实验 / 批次 |
| Characterization analysis unavailable / The characterization analysis for this result is not available in a readable form. Re-upload the result file or contact an instructor. | 表征分析不可用 / 该结果的表征分析无法以可读形式提供。请重新上传结果文件或联系导师。 |
| Unsaved analysis preview | 未保存的分析预览 |
| {n} assignment change{s} · {n} exclusion change{s} · Statistics and filtered figures preview your exclusion selection. | {n} 处关联变更 · {n} 处排除变更 · 统计与筛选图表正在预览您的排除选择。 |
| Assignment changes take effect after saving. | 关联变更将在保存后生效。 |
| Apply assignment changes | 应用关联变更 |
| Save manual exclusions | 保存手动排除 |
| Discard changes | 放弃变更 |
| Current analysis filter | 当前分析筛选 |
| Voc < {x} V · PCE < {y}% · FF < {z}% · {n} devices match. Thresholds are not saved. | Voc < {x} V · PCE < {y}% · FF < {z}% · {n} 个器件匹配。阈值不会被保存。 |
| off | 关 |
| Measurement quality warnings | 测量质量警告 |
| Substrates / Devices / Valid traces / Best forward PCE (%) / Best reverse PCE (%) | 基底 / 器件 / 有效曲线 / 最佳正向 PCE (%) / 最佳反向 PCE (%) |
| Result sections | 结果分区 |
| Assignments / Statistics / J–V curves / Uniformity / Data & provenance | 关联 / 统计 / J–V 曲线 / 均匀性 / 数据与溯源 |
| Integrity & provenance | 完整性与溯源 |
| Experiment / Size / SHA-256 / Analysis schema / Uploaded by | 实验 / 大小 / SHA-256 / 分析数据结构 / 上传者 |
| Not available | 不可用 |
| Substrate condition assignment | 基底条件关联 |
| {n} groups | {n} 组 |
| Edit assignments | 编辑关联 |
| Select exactly one experiment condition for each substrate name read from the measurement file. Names do not set conditions automatically. If a name is not a physical laser mark, condition statistics and figures remain available, while physical device linkage stays unresolved. | 为测量文件中读取的每个基底名称恰好选择一个实验条件。名称不会自动设定条件。若名称不是物理激光标记，条件统计与图表仍可用，但物理器件关联保持未解析。 |
| All substrates must be assigned before statistics are calculated. | 统计计算前必须关联所有基底。 |
| Assign {substrate_id} to | 将 {substrate_id} 与以下条件关联 |
| Choose a condition… | 请选择条件… |
| {name} ({kind}) | {name}（{kind}） |
| Inconsistent condition assignment: the device rows for this substrate disagree. Review the saved assignments. | 条件关联不一致：该基底的器件行互相矛盾。请检查已保存的关联。 |
| Correction reason | 更正原因 |
| Assignment correction reason | 关联更正原因 |
| Saving… / Save assignments | 保存中… / 保存关联 |
| Assignments saved for {n} substrates. | 已为 {n} 片基底保存关联。 |
| Enter a correction reason before changing saved assignments. | 修改已保存的关联前请填写更正原因。 |
| Assignments saved. Analysis updated. / Manual exclusions saved. | 关联已保存，分析已更新。/ 手动排除已保存。 |
| Unable to save assignments. | 无法保存关联。 |
| Device exclusions · {n} selected | 器件排除 · 已选 {n} 项 |
| Device scan history · {n} assignments | 器件扫描历史 · {n} 条关联 |
| Saved assignment provenance · {n} rows | 已保存关联溯源 · {n} 行 |
| No saved assignment provenance rows. | 暂无已保存的关联溯源记录。 |
| Analysis device / Analysis substrate / Instrument label / Fabrication device / Substrate / Condition / Batch condition（表头） | 分析器件 / 分析基底 / 仪器标签 / 制备器件 / 基底 / 条件 / 批次条件 |
| Parsed devices · {n} devices | 解析器件 · {n} 个器件 |
| Parsed devices | 解析器件 |
| Device / Substrate / Group / Traces / Scan / Voc / Jsc / FF / PCE（表头） | 器件 / 基底 / 分组 / 曲线 / 扫描 / Voc / Jsc / FF / PCE |
| {direction} valid / {direction} invalid | {direction} 有效 / {direction} 无效 |
| No valid trace | 无有效曲线 |
| Forward / Reverse | 正向 / 反向 |
| Unassigned | 未关联 |
| Publication substrate uniformity | 出版级基底均匀性 |
| Metric / Scan direction / Color palette | 指标 / 扫描方向 / 配色方案 |
| Color bar minimum / Color bar maximum / Problem threshold | 色条最小值 / 色条最大值 / 问题阈值 |
| Apply color range / Reset color range | 应用颜色范围 / 重置颜色范围 |
| Values use the selected metric's unit. Blank bounds use the automatic range. The threshold marks the color scale midpoint; with RdYlGn, values below it are red/yellow and values above it are green. Both device scopes share the scale. For diverging red-blue, white marks the threshold when set; otherwise it marks the all-device median if within range, or the selected range midpoint. Color bar ticks and cell numbers show the measured metric. | 数值使用所选指标的单位。留空的边界使用自动范围。阈值标记色阶中点；使用 RdYlGn 时，低于阈值显示红/黄色，高于阈值显示绿色。两种器件范围共用同一色阶。对于发散红蓝配色，设置阈值时白色标记阈值；否则标记全器件中位数（若在范围内）或所选范围中点。色条刻度与单元格数字显示实测指标。 |
| Enter finite numeric values for the color range. | 请为颜色范围输入有限数值。 |
| Enter both a minimum and maximum, or leave both blank for the automatic range. | 请同时输入最小值和最大值，或都留空使用自动范围。 |
| The color bar minimum must be lower than its maximum. | 色条最小值必须小于最大值。 |
| The problem threshold must be inside the color bar range. | 问题阈值必须在颜色范围内。 |
| Directional group statistics | 分方向分组统计 |
| One representative scan per device and direction. Best and mean are calculated separately for forward and reverse scans. Both scopes use the current exclusion selection. | 每个器件每个方向取一条代表性扫描。最佳值与均值分别按正向和反向扫描计算。两种范围均使用当前排除选择。 |
| Directional group statistics（表格 aria-label） | 分方向分组统计 |
| Group / Scope / Scan / Devices（表头） | 分组 / 范围 / 扫描 / 器件 |
| Voc (V) / Jsc (mA cm⁻²) / FF (%) / PCE (%)，子标题 Best / mean | Voc (V) / Jsc (mA cm⁻²) / FF (%) / PCE (%)，子标题 最佳 / 均值 |
| All devices / After exclusions | 全部器件 / 排除后 |
| Metric distributions | 指标分布 |
| Forward and reverse scans are separate (F/R). Both device scopes use the current exclusion selection. | 正向与反向扫描分开显示（F/R）。两种器件范围均使用当前排除选择。 |
| All devices / Exclude flagged devices ({n}) / Unsaved preview | 全部器件 / 排除已标记器件（{n}）/ 未保存预览 |
| Publication substrate uniformity for {metric}, {direction} scan | {metric} 的出版级基底均匀性，{direction} 扫描 |
| {metric} publication box plot with device points, split by scan direction | {metric} 出版级箱线图（含器件点），按扫描方向分列 |
| Publication J-V curves for {ids} | {ids} 的出版级 J-V 曲线 |
| All-device J-V curves by group | 按分组的全器件 J-V 曲线 |
| Publication J–V curves | 出版级 J–V 曲线 |
| Select all / Plot selected / Clear | 全选 / 绘制所选 / 清除 |
| {n} selected / {n} selected · all | 已选 {n} 项 / 已选 {n} 项 · 全部 |
| Color palette | 配色方案 |
| Standalone J–V (orange / teal) / Nature Classic / Science / Paul Tol / Lancet Clinical / NEJM Palette | Standalone J–V（橙 / 青）/ Nature 经典 / Science / Paul Tol / Lancet 临床 / NEJM 配色 |
| The first {n} selected devices will be plotted. | 将绘制前 {n} 个所选器件。 |
| {n} selected device{s} shown. Clear to return to all devices. | 已显示 {n} 个所选器件。清除以返回全部器件。 |
| Showing every device by group. Select devices and choose Plot selected for individual curves. | 正按分组显示全部器件。选择器件并点击"绘制所选"可查看单独曲线。 |
| Device metrics · {n} devices | 器件指标 · {n} 个器件 |
| Select / Device / Substrate / Group / Scan / Valid scans / Voc / Jsc / FF / PCE（表头） | 选择 / 器件 / 基底 / 分组 / 扫描 / 有效扫描 / Voc / Jsc / FF / PCE |
| excluded | 已排除 |
| Select {device_id} | 选择 {device_id} |
| Choose devices ({n} selected) | 选择器件（已选 {n} 项） |
| Search devices | 搜索器件 |
| Device / substrate… | 器件 / 基底… |
| Choose device {id} | 选择器件 {id} |
| (excluded from statistics) | （已从统计中排除） |
| No matching devices. | 没有匹配的器件。 |
| Device exclusions | 器件排除 |
| {n} manual · {n} threshold matches | {n} 项手动 · {n} 项阈值匹配 |
| Automatic exclusion requires both forward and reverse representative scans to fall below at least one enabled threshold. Each metric uses the same threshold in both directions; different metrics may trigger each direction. Devices with a missing direction need manual review. Threshold matches apply only to the current analysis view and are not saved. Manual reasons are saved and take priority. Exclusion never removes J–V curves or the underlying measurements. | 自动排除要求正向和反向代表性扫描都低于至少一个启用的阈值。每个指标在两个方向使用同一阈值；不同指标可分别触发各方向。缺少某一方向的器件需人工复核。阈值匹配仅作用于当前分析视图且不会被保存。手动原因会被保存并优先生效。排除不会删除 J–V 曲线或底层测量数据。 |
| Voc below (V) / PCE below (%) / FF below (%) | Voc 低于 (V) / PCE 低于 (%) / FF 低于 (%) |
| Flag devices with Voc below (V) 等 aria-label | 标记 Voc 低于 (V) 的器件 等 |
| Apply thresholds / Clear threshold filter / Clear manual exclusions | 应用阈值 / 清除阈值筛选 / 清除手动排除 |
| Exclude / Device / Substrate / Group / Voc (V), F / R / PCE (%), F / R / FF (%), F / R / Reason（表头） | 排除 / 器件 / 基底 / 分组 / Voc (V)，F/R / PCE (%)，F/R / FF (%)，F/R / 原因 |
| Exclude {id} | 排除 {id} |
| Threshold match | 阈值匹配 |
| Exclusion reason for {id} | {id} 的排除原因 |
| flagged as an outlier | 标记为离群值 |
| Device scan history | 器件扫描历史 |
| {n} device{s} | {n} 个器件 |
| Device | 器件 |
| {mark} · #{id} / {code} / Device {id} | {mark} · #{id} / {code} / 器件 {id} |
| Unable to load scan history for device {id}: {err} | 无法加载器件 {id} 的扫描历史：{err} |
| Loading scan history… | 正在加载扫描历史… |
| No valid {direction} scan on record. | 没有有效的{direction}扫描记录。 |
| Forward best / Reverse best | 正向最佳 / 反向最佳 |
| user choice / best PCE | 用户选择 / 最佳 PCE |
| Clear choice | 清除选择 |
| From {file_id} · {trace_id} · measured {time} · {source} | 来自 {file_id} · {trace_id} · 测量于 {time} · {source} |
| All scans ({n}) | 全部扫描（{n}） |
| Direction / Measured / PCE (%) / Source / File / Representative（表头） | 方向 / 测量时间 / PCE (%) / 来源 / 文件 / 代表性 |
| current / Set as representative / — | 当前 / 设为代表性 / — |
| error: {msg} | 错误：{msg} |
| The request failed. | 请求失败。 |
| Download | 下载 |
| SVG / PDF / TIFF | SVG / PDF / TIFF |
| Save exclusion changes before downloading the filtered figure. | 下载筛选后图表前请先保存排除变更。 |
| The publication figure could not be generated for this selection. | 无法为当前选择生成出版级图表。 |
| Python/Matplotlib preview. The downloaded SVG, PDF, and TIFF use the same data and layout. | Python/Matplotlib 预览。下载的 SVG、PDF 和 TIFF 使用相同的数据与布局。 |
| Publication figure downloads | 出版级图表下载 |

## 13. 分析工作台

| English | 中文 |
|---|---|
| Analysis workbench | 分析工作台 |
| Overlay J-V curves, compare frozen planned conditions, and review campaign-level measurements across characterization results. | 叠加 J-V 曲线、对比已固定的计划条件，并跨表征结果查看实验系列级测量。 |
| Unable to load the workbench. | 无法加载工作台。 |
| Loading the workbench… | 正在加载工作台… |
| No characterization results exist yet — upload a result file first. | 尚无表征结果——请先上传结果文件。 |
| RESULTS · {n} SELECTED (MAX 12) | 结果 · 已选 {n} 项（最多 12） |
| Unnamed experiment | 未命名实验 |
| {experiment_code}/{batch_code}: {filename} | {experiment_code}/{batch_code}：{filename} |
| {experiment} · {batch} · {time} · {x}% best PCE in {scope} | {experiment} · {batch} · {time} · {scope}范围内最佳 PCE {x}% |
| Select {identity} | 选择 {identity} |
| Palette | 配色 |
| science-tol / nature-classic / lancet-clinical / nejm | science-tol / nature-classic / lancet-clinical / nejm（配色键名，保持原文） |
| Render overlay | 渲染叠加图 |
| Compare conditions | 对比条件 |
| Rendering overlay for {labels}… | 正在为 {labels} 渲染叠加图… |
| Unable to render the overlay for {labels}. Results need valid forward J-V traces. Review the selected files or try rendering again. | 无法为 {labels} 渲染叠加图。结果需要有效的正向 J-V 曲线。请检查所选文件或重试。 |
| Select results and render the overlay — one best forward curve per result file. | 选择结果并渲染叠加图——每个结果文件取一条最佳正向曲线。 |
| Loading frozen conditions for the selected experiments… | 正在加载所选实验已固定的条件… |
| Unable to compare the selected experiments: {err} | 无法对比所选实验：{err} |
| Condition comparison | 条件对比 |
| Values show the saved plan for every control and target condition. | 数值显示每个对照与目标条件的已保存计划。 |
| No frozen conditions are available for these experiments. | 这些实验没有可用的已固定的条件。 |
| Frozen planned conditions for all selected experiments, including control and target conditions | 所有所选实验已固定的计划条件，含对照与目标条件 |
| ◆ differs | ◆ 有差异 |
| Cross-result J-V overlay: {labels} | 跨结果 J-V 叠加图：{labels} |

### 条件矩阵行标签（conditionMatrix）

| English | 中文 |
|---|---|
| Setup / Junction / Bandgap / Tandem type / Product | 设置 / 结型 / 带隙 / 叠层类型 / 产品 |
| Width / Length / Substrate width / Substrate length | 宽度 / 长度 / 基底宽度 / 基底长度 |
| Layer type / Formulation / Stock dispersion / Stock volume / Weight / Volume | 层类型 / 配方 / 原液 / 原液体积 / 质量 / 体积 |
| Speed / Duration / Acceleration / Temperature / Pressure / Flow / Target pressure / Hold duration | 转速 / 时长 / 加速度 / 温度 / 压强 / 流量 / 目标压强 / 保持时长 |
| VCD sequence / Sputter mode / Power / Gas 1 / Gas 2 / Gas 1 flow / Gas 2 flow / Thickness / Rate / Substrate temperature | VCD 顺序 / 溅射模式 / 功率 / 气体 1 / 气体 2 / 气体 1 流量 / 气体 2 流量 / 厚度 / 速率 / 基底温度 |
| Devices per substrate / Device active area / Total active area / Planned substrates / Expected devices | 每基底器件数 / 器件有效面积 / 总有效面积 / 计划基底数 / 预期器件数 |
| Layer / Solid / Solvent / Spin step / Anneal step / VCD stage / Gas backfill | 层 / 固体 / 溶剂 / 旋涂步骤 / 退火步骤 / VCD 阶段 / 气体回填 |
| Yes / No | 是 / 否 |
| VCD stage {n} / Gas backfill {n} / Spin step {n} | VCD 阶段 {n} / 气体回填 {n} / 旋涂步骤 {n} |
| Device / Deposition / Layout / Planned substrates / Expected devices（路径根） | 器件 / 沉积 / 布局 / 计划基底数 / 预期器件数 |

### 实验系列分析面板（CampaignAnalysisPanel）

| English | 中文 |
|---|---|
| Campaign comparison | 实验系列对比 |
| Read-only comparison across the campaign: directional device statistics, recorded actual process variants against the frozen plan, and same-batch control/target differences. | 当前实验系列内的只读对比：分方向器件统计、相对已固定的计划的实际工艺变体，以及同批次对照/目标差异。 |
| Campaign / Batch / Representative | 实验系列 / 批次 / 代表值 |
| All batches | 全部批次 |
| latest upload / mean across uploads | 最新上传 / 各上传均值 |
| Loading campaign analysis… | 正在加载实验系列分析… |
| Unable to load the campaign analysis: {err} | 无法加载实验系列分析：{err} |
| Campaign comparison needs an experiment in a campaign — none is visible yet. | 实验系列对比需要实验系列内的实验——目前尚无可见实验。 |
| {n} experiment(s) in scope · rules {v} · representative {r} · digest {d} | 范围内 {n} 个实验 · 规则 {v} · 代表值 {r} · 摘要 {d} |
| Directional summaries | 分方向汇总 |
| Forward and reverse scans are reported separately. Device statistics are descriptive; the substrate mean is the equally weighted per-substrate view. | 正向与反向扫描分开报告。器件统计为描述性统计；基底均值是等权重的逐基底视图。 |
| No measured devices are visible in this scope yet. | 该范围内尚无可见的已测量器件。 |
| Directional summaries per condition variant, forward and reverse separate | 按条件变体的分方向汇总，正反向分开 |
| Campaign summary table | 实验系列汇总表 |
| Condition / Variant / Direction / Devices / Substrates / Measurements / PCE median / PCE best / Voc / Jsc / FF / Substrate-mean PCE（表头） | 条件 / 变体 / 方向 / 器件 / 基底 / 测量 / PCE 中位数 / PCE 最佳 / Voc / Jsc / FF / 基底均值 PCE |
| {value} ({n} substrate units) | {value}（{n} 个基底单元） |
| forward / reverse（单元格值） | 正向 / 反向 |
| Actual process vs frozen plan | 实际工艺 vs 已固定的计划 |
| Each variant shows the effective value behind the statistics (the recorded actual value, the frozen-plan fallback marked 'planned', or '—' for a step the execution never performed) beside the frozen plan's reference value. '◆ deviates from plan' marks rows where the effective value differs from the plan. | 每个变体在已固定的计划参考值旁显示统计背后的有效值（记录的实际值、标记为"计划"的已固定的计划回退值，或执行中从未进行的步骤显示"—"）。"◆ 偏离计划"标记有效值与计划不同的行。 |
| No fabrication batches exist for this scope yet. | 该范围内尚无制备批次。 |
| Recorded actual process parameters beside the frozen plan reference per condition variant | 按条件变体，记录的实际工艺参数与已固定的计划参考值并列 |
| Actual process comparison table | 实际工艺对比表 |
| Parameter / Actual / effective / Planned (frozen) | 参数 / 实际 / 有效 / 计划（已固定） |
| Variant {n} · {source} | 变体 {n} · {source} |
| ◆ deviates from plan | ◆ 偏离计划 |
| actual / planned / not executed | 实际 / 计划 / 未执行 |
| Same-batch control vs target | 同批次对照 vs 目标 |
| Descriptive difference of equally weighted substrate means within one batch. No significance test is applied; percent change is undefined when the control mean is zero. | 同一批次内等权重基底均值的描述性差异。不做显著性检验；对照均值为零时百分比变化无定义。 |
| Descriptive control versus target comparisons per batch, direction, and metric | 按批次、方向和指标的描述性对照与目标对比 |
| Control target comparison table | 对照目标对比表 |
| Batch / Control / Target / Direction / Metric / Control mean / Target mean / Difference / Change / Units (control/target)（表头） | 批次 / 对照 / 目标 / 方向 / 指标 / 对照均值 / 目标均值 / 差值 / 变化 / 单位（对照/目标） |
| — (control mean is zero) | —（对照均值为零） |
| Measurement coverage | 测量覆盖 |
| {condition}: {measured}/{denominator} measured ({pct}%) | {condition}：已测 {measured}/{denominator}（{pct}%） |
| Denominator basis: {basis} substrate count ({value}). {note} | 分母依据：{basis} 基底数（{value}）。{note} |
| Data quality | 数据质量 |
| Every excluded or unresolvable record is listed here; nothing is silently dropped from the payload. | 每条被排除或无法解析的记录都列在此处；不会从数据中静默丢弃任何内容。 |
| No exclusions, unbound devices, missing directions, or legacy records in this scope. | 该范围内没有排除、未绑定器件、缺失方向或遗留记录。 |
| {code}: {message} | {code}：{message} |
| Result {id} / Source result {id} | 结果 {id} / 源结果 {id} |
| {experiment_code}/{batch_code} · {condition_code} ({role}) | {experiment_code}/{batch_code} · {condition_code}（{role}） |
| Condition {id} | 条件 {id} |
| Variant {n} · {source} (planned fallback) | 变体 {n} · {source}（计划回退） |

### 实验系列分析参数标签（campaignView）

| English | 中文 |
|---|---|
| Cast speed / Cast duration / Cast acceleration | 滴涂转速 / 滴涂时长 / 滴涂加速度 |
| Spread speed / Spread duration / Spread acceleration | 铺展转速 / 铺展时长 / 铺展加速度 |
| Thin speed / Thin duration / Thin acceleration | 减薄转速 / 减薄时长 / 减薄加速度 |
| VCD stage 1 valve / pressure / duration（及 stage 2/3 同构） | VCD 阶段 1 阀门 / 压强 / 时长（及阶段 2/3 同构） |
| Anneal 1 temperature / Anneal 1 duration | 退火 1 温度 / 退火 1 时长 |

## 14. 实验系列

| English | 中文 |
|---|---|
| Loading Campaigns… | 正在加载实验系列… |
| Unable to load Campaigns. | 无法加载实验系列。 |
| Campaigns | 实验系列 |
| Organize related experiments under stable series identifiers. | 在稳定的系列标识下组织相关实验。 |
| Active series available for new experiment plans. | 可用于新实验计划的进行中系列。 |
| Create Campaign | 创建实验系列 |
| Campaign code | 实验系列编号 |
| Display name | 显示名称 |
| Purpose | 目的 |
| Creating… / Create Campaign | 创建中… / 创建实验系列 |
| Campaign created. / Campaign status updated. | 实验系列已创建。/ 实验系列状态已更新。 |
| Unable to create Campaign. / Unable to update Campaign. | 无法创建实验系列。/ 无法更新实验系列。 |
| Campaign directory | 实验系列目录 |
| Campaign / Purpose / Status / Updated / Manage（表头） | 实验系列 / 目的 / 状态 / 更新时间 / 管理 |
| active / closed / archived | 进行中 / 已关闭 / 已归档 |
| Status for {name} | {name} 的状态 |
| No Campaigns are available. | 暂无可用实验系列。 |
| Unable to load the campaign workspace | 无法加载实验系列工作区 |
| Loading campaign workspace… | 正在加载实验系列工作区… |
| Campaign not found / No campaign with code "{code}". | 未找到实验系列 / 没有编号为"{code}"的实验系列。 |
| {code} · {status} · {n} records in the pipeline | {code} · {status} · 流水线中 {n} 条记录 |
| All campaigns | 全部实验系列 |
| Nothing in the pipeline for this campaign yet. / Experiments appear here once a plan is created under this campaign. | 该实验系列的流水线暂无任何记录。/ 在该实验系列下创建计划后，实验将显示在此处。 |
| PLANNING / FABRICATION / CHARACTERIZATION（阶段标签） | 规划中 / 制备中 / 表征中 |
| Campaign records | 实验系列记录 |
| Record details | 记录详情 |
| Campaign › {Stage} › {code} | 实验系列 › {阶段} › {code} |
| Plan {status} · updated {time} | 计划{status} · 更新于 {time} |
| Open experiment / Open run sheet / Open result | 打开实验 / 打开制备记录单 / 打开结果 |
| Select a record from the left rail | 从左侧栏选择一条记录 |
| The pane shows its pipeline stage, status, and a link to the full page. | 该面板显示其流水线阶段、状态以及指向完整页面的链接。 |

## 15. 材料

| English | 中文 |
|---|---|
| Loading materials… | 正在加载材料… |
| Unable to load materials. | 无法加载材料。 |
| Material directory | 材料目录 |
| Reusable materials and supplier products for experiment planning. Student submissions remain pending until reviewed. | 用于实验规划的可复用材料与供应商产品。学生提交的内容在审核前保持待审状态。 |
| New material | 新建材料 |
| Material filters | 材料筛选 |
| Search materials | 搜索材料 |
| Name, formula, CAS, or specification | 名称、分子式、CAS 或规格 |
| Category | 类别 |
| All categories | 全部类别 |
| Substrates / Chemicals and reagents / Solvents / Gases / Other materials | 基底 / 化学品与试剂 / 溶剂 / 气体 / 其他材料 |
| Status | 状态 |
| All statuses | 全部状态 |
| pending / active / inactive | 待审核 / 可用 / 已停用 |
| {n} of {total} records | 共 {total} 条，显示 {n} 条 |
| Clear filters | 清除筛选 |
| No materials have been recorded. / Add the first reusable material to start the directory. | 尚未记录任何材料。/ 添加第一种可复用材料以建立目录。 |
| No materials match the current filters. | 没有符合当前筛选的材料。 |
| This material is no longer in the visible directory. | 该材料已不在可见目录中。 |
| Back to directory | 返回目录 |
| No formula recorded | 未记录分子式 |
| · CAS {cas} | · CAS {cas} |
| No specifications recorded. | 未记录规格。 |
| {n} supplier product{s} · updated {time} | {n} 个供应商产品 · 更新于 {time} |
| View details / Edit | 查看详情 / 编辑 |
| ← Back to directory | ← 返回目录 |
| CAS {cas} | CAS {cas} |
| Edit material | 编辑材料 |
| Identity | 标识 |
| Name / Category / Formula / CAS number / Record status / Updated | 名称 / 类别 / 分子式 / CAS 号 / 记录状态 / 更新时间 |
| Specification | 规格 |
| Values recorded for this material. Missing optional values are not inferred. | 为该材料记录的数值。缺失的可选值不做推断。 |
| No scalar specification values recorded. | 未记录标量规格值。 |
| Raw specification (JSON) | 原始规格（JSON） |
| Supplier products | 供应商产品 |
| Each product keeps its own vendor, catalog number, review status, and specification — independent of the material record's status. | 每个产品保留自己的供应商、货号、审核状态与规格——独立于材料记录的状态。 |
| No supplier products have been recorded. | 尚未记录供应商产品。 |
| Add supplier product / Propose supplier product | 添加供应商产品 / 提议供应商产品 |
| New vendor for {name} | {name} 的新供应商 |
| New catalog number for {name} | {name} 的新货号 |
| Add product / Submit product for review | 添加产品 / 提交产品审核 |
| Supplier product added. / Supplier product submitted for review. | 供应商产品已添加。/ 供应商产品已提交审核。 |
| Unable to save the supplier product. | 无法保存供应商产品。 |
| Edit product | 编辑产品 |
| Vendor for {catalog} | {catalog} 的供应商 |
| Catalog number for {material} product {id} | {material} 产品 {id} 的货号 |
| Status for {vendor} {catalog} | {vendor} {catalog} 的状态 |
| Save product | 保存产品 |
| Supplier product updated. | 供应商产品已更新。 |
| Unable to update the supplier product. | 无法更新供应商产品。 |
| New material / Edit {name} | 新建材料 / 编辑 {name} |
| Category {category} is fixed for an existing record. Saving updates this record in place. | 已有记录的类别 {category} 不可更改。保存将就地更新该记录。 |
| Students submit materials for review; instructors and administrators add them to the active directory directly. | 学生提交材料待审核；导师与管理员可直接添加到正式目录。 |
| Ordinary values use key/value rows. Lists and nested objects stay untouched in the record and are edited through the advanced editor — nothing is flattened or dropped. | 普通值使用键/值行。列表与嵌套对象在记录中保持原样，通过高级编辑器编辑——不会被展平或丢弃。 |
| Supplier products are managed on the material's detail page, inside the parent material context. | 供应商产品在材料详情页中管理，处于所属材料的上下文内。 |
| {n} supplier product{s} recorded. Open the detail view to add or edit products. | 已记录 {n} 个供应商产品。打开详情视图可添加或编辑产品。 |
| Save the material first — supplier products are added to an existing record from its detail page. | 请先保存材料——供应商产品在已有记录的详情页中添加。 |
| Material category (fixed) / Material category / Material name / Formula / CAS number / Record status | 材料类别（固定）/ 材料类别 / 材料名称 / 分子式 / CAS 号 / 记录状态 |
| Card preview | 卡片预览 |
| Cancel discards the entered values without sending any request. | 取消将丢弃所填内容，不发送任何请求。 |
| Saving… / Save material / Add active material / Submit material for review | 保存中… / 保存材料 / 添加正式材料 / 提交材料审核 |
| Material updated. / Material added to the active directory. / Material submitted for review. | 材料已更新。/ 材料已添加到正式目录。/ 材料已提交审核。 |
| Unable to save the material. | 无法保存材料。 |
| Substrate / Chemical / Solvent / Gas / Other material（单数类别） | 基底 / 化学品 / 溶剂 / 气体 / 其他材料 |
| Advanced editing is active — the key/value rows below are paused. Apply or discard the JSON draft to resume row editing. | 高级编辑已激活——下方键/值行已暂停。应用或放弃 JSON 草稿以恢复行编辑。 |
| Key | 键 |
| Text / Number / On/off | 文本 / 数字 / 开关 |
| Value type for {key} | {key} 的值类型 |
| On / Off | 开 / 关 |
| Value for {key} | {key} 的值 |
| Remove specification row {key} | 移除规格行 {key} |
| Enter a key for this value, or remove the row. | 请为该值输入键，或移除该行。 |
| This key is used more than once. | 该键被多次使用。 |
| This key is already used by a kept array or object value. | 该键已被保留的数组或对象值占用。 |
| Enter a number, or remove the row. / Enter a number. | 请输入数字，或移除该行。/ 请输入数字。 |
| No structured specification values yet. Add a key/value row or use the advanced editor. | 尚无结构化规格值。添加键/值行或使用高级编辑器。 |
| Kept without changes (edit in the advanced editor): {keys}. | 保持不变（请在高级编辑器中编辑）：{keys}。 |
| Add specification row | 添加规格行 |
| Hide advanced specification editor / Advanced specification editor (JSON) | 隐藏高级规格编辑器 / 高级规格编辑器（JSON） |
| Apply or discard the JSON draft before saving — the form cannot submit while an advanced edit is pending. | 保存前请应用或放弃 JSON 草稿——高级编辑未决时表单无法提交。 |
| Advanced specification (JSON) | 高级规格（JSON） |
| Edits the complete specification, including lists and nested objects the rows cannot represent. Apply commits the draft; rows stay paused until then. | 编辑完整规格，包括行无法表示的列表与嵌套对象。应用即提交草稿；在此之前行保持暂停。 |
| Apply JSON draft / Discard draft | 应用 JSON 草稿 / 放弃草稿 |

## 16. 层预设

| English | 中文 |
|---|---|
| Loading layer presets… | 正在加载层预设… |
| Unable to load layer presets. | 无法加载层预设。 |
| Layer presets | 层预设 |
| Reusable single-layer input templates. Selecting a preset copies its complete values into an editable experiment configuration. | 可复用的单层输入模板。选择预设会将其完整值复制到可编辑的实验配置中。 |
| New preset | 新建预设 |
| Unable to load student presets for promotion: {err} | 无法加载待提升的学生预设：{err} |
| Unable to promote the layer preset. | 无法提升该层预设。 |
| Shared presets / My presets / Student personal presets — promote to shared | 共享预设 / 我的预设 / 学生个人预设——提升为共享 |
| No {group title} match the current view. | 当前视图下没有匹配的{group title}。 |
| {name} is now shared with every student. | {name} 现已共享给所有学生。 |
| Promote layer preset to shared | 将层预设提升为共享 |
| Every student will be able to select {name} as a starting point. Promotion is one-way: the preset cannot be made personal again. | 所有学生都将能把 {name} 作为起点。提升是单向的：预设无法再变回个人。 |
| Promote to shared | 提升为共享 |
| This preset is no longer in the visible library. | 该预设已不在可见库中。 |
| Back to library | 返回库 |
| Layer preset filters | 层预设筛选 |
| Search presets | 搜索预设 |
| Name, material, or process | 名称、材料或工艺 |
| Layer type | 层类型 |
| All layer types | 全部层类型 |
| Method | 方法 |
| All methods | 全部方法 |
| Spin coating + VCD / No process recorded | 旋涂 + VCD / 未记录工艺 |
| Scope | 范围 |
| All scopes / Shared / Personal | 全部范围 / 共享 / 个人 |
| Status: Active / Inactive | 状态：启用 / 停用 |
| Incomplete template — missing: {gap}. Open the details to complete the deposition process. | 不完整模板——缺失：{gap}。请打开详情完善沉积工艺。 |
| Partial template — missing: {gap}. Complete these values per experiment, or finish the template. | 部分模板——缺失：{gap}。请在每个实验中补全这些值，或完善模板。 |
| r{n} · updated {time} | r{n} · 更新于 {time} |
| View details / Edit / Promote to shared | 查看详情 / 编辑 / 提升为共享 |
| shared / personal | 共享 / 个人 |
| inactive | 已停用 |
| ← Back to library | ← 返回库 |
| {layer_name} · Spin coating + VCD / {layer_name} · {method} | {layer_name} · 旋涂 + VCD / {layer_name} · {method} |
| Edit preset / Deactivate {name} | 编辑预设 / 停用 {name} |
| Partial template — this preset is legal to keep and revise, but it is not a complete experiment layer yet. Missing values are listed per section below. | 部分模板——该预设可以保留和修订，但尚不是完整的实验层。缺失值在下方分节列出。 |
| Template complete / Experiment-ready | 模板完整 / 可用于实验 |
| Layer and formulation | 层与配方 |
| Process in execution order | 按执行顺序的工艺 |
| Version history and comparison | 版本历史与对比 |
| Technical provenance | 技术溯源 |
| The perovskite program runs spin coating, then the vacuum/gas-backfill rows in their recorded order, then annealing. | 钙钛矿程序依次执行旋涂、按记录顺序的真空/气体回填行，然后退火。 |
| Recorded process values for this layer type. | 该层类型已记录的工艺值。 |
| Version history and comparison become available after the preset is promoted to shared. | 预设提升为共享后，版本历史与对比才可用。 |
| Spin coating / Vacuum and gas-backfill program / Annealing | 旋涂 / 真空与气体回填程序 / 退火 |
| Stage {n} / Evacuate (stage {n}) / Gas backfill (stage {n}) | 阶段 {n} / 抽真空（阶段 {n}）/ 气体回填（阶段 {n}） |
| {rpm} rpm · {s} s · {a} rpm/s | {rpm} rpm · {s} s · {a} rpm/s |
| {valve} · {p} Pa · {s} s | {valve} · {p} Pa · {s} s |
| {gas} · {f} sccm → {p} Pa · hold {s} s | {gas} · {f} sccm → {p} Pa · 保持 {s} s |
| {t} °C · {s} s | {t} °C · {s} s |
| No process recorded for this preset. | 该预设未记录工艺。 |
| Canonical hash, source key, and schema | 规范哈希、源键与数据结构 |
| Canonical hash / Preset key / Created / Updated | 规范哈希 / 预设键 / 创建时间 / 更新时间 |
| Deactivate layer preset | 停用层预设 |
| Existing experiment snapshots remain unchanged. This preset will no longer be available for new selections. | 已有实验快照保持不变。该预设将不再供新选择使用。 |
| Deactivate preset | 停用预设 |
| Layer preset deactivated. | 层预设已停用。 |
| Unable to deactivate the layer preset. | 无法停用层预设。 |
| Edit {name} | 编辑 {name} |
| Current revision r{n} — saving creates revision r{n+1}. Frozen experiment snapshots keep their own values. | 当前修订版 r{n}——保存将创建修订版 r{n+1}。已固定的实验快照保留自己的值。 |
| Presets are optional single-layer templates — experiments can also be planned from scratch without one. | 预设是可选的单层模板——实验也可以不借助预设从零规划。 |
| Creation mode | 创建方式 |
| From scratch / Copy existing preset | 从零创建 / 复制已有预设 |
| No saved presets to copy yet | 暂无可复制的已存预设 |
| Layer type / Choose a layer type… | 层类型 / 请选择层类型… |
| Preset name / Layer name | 预设名称 / 层名称 |
| Role {role} — derived from the layer type and fixed for this preset. | 角色 {role}——由层类型决定，此预设不可更改。 |
| Preset scope | 预设范围 |
| Shared directory / Personal | 共享目录 / 个人 |
| Enter a preset name. / Enter a layer name. | 请输入预设名称。/ 请输入层名称。 |
| Creating… / Create shared preset / Create personal preset | 创建中… / 创建共享预设 / 创建个人预设 |
| Layer preset created from scratch. | 层预设已从零创建。 |
| Unable to create the layer preset. | 无法创建层预设。 |
| Copies the selected preset's complete values into a new independent preset with its own history — the source preset is unchanged. To record the next version of the same preset instead, use Edit preset and save a new revision. | 将所选预设的完整值复制到一个拥有独立历史的新预设——源预设保持不变。若要记录同一预设的下一个版本，请使用"编辑预设"并保存新修订版。 |
| New preset name | 新预设名称 |
| Source preset | 源预设 |
| {name} · {role} · {scope} | {name} · {role} · {scope} |
| Unavailable source preset | 源预设不可用 |
| The selected source preset is no longer available. Choose another source preset. | 所选源预设不再可用。请选择其他源预设。 |
| Select an active source preset. | 请选择一个可用的源预设。 |
| The selected source preset is no longer available (it may have been deactivated). Choose another source preset to continue. | 所选源预设不再可用（可能已被停用）。请选择其他源预设以继续。 |
| Layer preset created from a complete snapshot. | 层预设已从完整快照创建。 |
| Unsaved edits to this preset were restored from your last session. | 已恢复您上次会话中对该预设的未保存修改。 |
| Discard edits | 放弃修改 |
| Layer type {type} · role {role} · source key {key}. These identity fields are fixed for this preset. | 层类型 {type} · 角色 {role} · 源键 {key}。这些标识字段对此预设不可更改。 |
| No perovskite deposition process — this layer type records its process above. | 无钙钛矿沉积工艺——该层类型在上方记录其工艺。 |
| Save new revision | 保存新修订版 |
| Saving creates revision r{n}; existing experiment snapshots are never changed. | 保存将创建修订版 r{n}；已有实验快照永远不会被改变。 |
| A new immutable preset revision was saved. | 新的不可变预设修订版已保存。 |
| Unable to revise the layer preset. | 无法修订层预设。 |
| Preset preview | 预设预览 |
| Preview — this creates the new independent preset {name} ({scope}) | 预览——这将创建新的独立预设 {name}（{scope}） |
| Preview — this saves revision r{n} of {name} ({scope}) | 预览——这将保存 {name}（{scope}）的修订版 r{n} |
| (unnamed) | （未命名） |
| Template incomplete / Single-layer template / Partial template | 模板不完整 / 单层模板 / 部分模板 |
| What this template is still missing | 此模板还缺少什么 |
| Complete these values before saving a revision | 保存修订版前请完成以下内容 |
| {section} — complete in {where}. | {section}——请在{where}中完善。 |
| HTL / ETL | HTL / ETL |
| No deposition process recorded / No process recorded | 未记录沉积工艺 / 未记录工艺 |
| {n} spin stage{s} · {n} evacuation stage{s} · {n} gas-backfill stage{s} · {n} annealing stage{s} | {n} 个旋涂阶段 · {n} 个抽真空阶段 · {n} 个气体回填阶段 · {n} 个退火阶段 |
| Sputtering · {mode} · {w} W / Evaporation · {t} nm / ALD · {n} cycles | 溅射 · {mode} · {w} W / 蒸发 · {t} nm / ALD · {n} 循环 |
| Diluted dispersion / Weighed solids / Not recorded / None recorded / Unnamed | 稀释分散液 / 称量固体 / 未记录 / 无记录 / 未命名 |
| Formulation / Stock dispersion / Stock volume / Solid {n} / Solvent {n} / Solids / Solvents / Spin stages / Annealing / Process values / VCD program / Layer type / Role / Method / Revision / Scope | 配方 / 原液 / 原液体积 / 固体 {n} / 溶剂 {n} / 固体 / 溶剂 / 旋涂阶段 / 退火 / 工艺值 / VCD 程序 / 层类型 / 角色 / 方法 / 修订版 / 范围 |
| Perovskite spin stages / Perovskite evacuation stages / Perovskite gas-backfill stages / Perovskite program order / Perovskite annealing stages / Perovskite deposition process / Solution solids / Solution solvents / Solution formulation / Layer spin stages / Layer annealing stages / Layer process / Layer name / Layer values / Preset name / Other values | 钙钛矿旋涂阶段 / 钙钛矿抽真空阶段 / 钙钛矿气体回填阶段 / 钙钛矿程序顺序 / 钙钛矿退火阶段 / 钙钛矿沉积工艺 / 溶液固体 / 溶液溶剂 / 溶液配方 / 层旋涂阶段 / 层退火阶段 / 层工艺 / 层名称 / 层值 / 预设名称 / 其他值 |
| the Perovskite deposition process editor, Spin stages | "钙钛矿沉积工艺"编辑器的"旋涂阶段" |
| the Perovskite deposition process editor, Vacuum and gas-backfill program | "钙钛矿沉积工艺"编辑器的"真空与气体回填程序" |
| the order of rows in the Vacuum and gas-backfill program | "真空与气体回填程序"中的行顺序 |
| the Perovskite deposition process editor, Annealing stages | "钙钛矿沉积工艺"编辑器的"退火阶段" |
| the Perovskite deposition process editor | "钙钛矿沉积工艺"编辑器 |
| the Solution formulation editor, Solid ingredients | "溶液配方"编辑器的"固体成分" |
| the Solution formulation editor, Solvents | "溶液配方"编辑器的"溶剂" |
| the Solution formulation editor | "溶液配方"编辑器 |
| the Layer process editor, Spin stages | "层工艺"编辑器的"旋涂阶段" |
| the Layer process editor, Annealing stages | "层工艺"编辑器的"退火阶段" |
| the Layer process editor | "层工艺"编辑器 |
| the Layer name field | "层名称"字段 |
| the layer editors | 层编辑器 |
| the Preset name field | "预设名称"字段 |
| the preset editors | 预设编辑器 |
| Compare revisions | 对比修订版 |
| Loading revisions… | 正在加载修订版… |
| Unable to load preset revisions. | 无法加载预设修订版。 |
| Only one revision exists for this preset, so there is nothing to compare yet. The comparison becomes available after the next saved revision. | 该预设只有一个修订版，暂无可对比内容。保存下一个修订版后即可对比。 |
| Older revision / Newer revision | 较早修订版 / 较新修订版 |
| Older revision to compare for {name} / Newer revision to compare for {name} | 用于对比的 {name} 较早修订版 / 较新修订版 |
| r{n} · {time} | r{n} · {time} |
| Comparing r{a} ({time}, actor {id}) with r{b} ({time}, actor {id}). | 正在对比 r{a}（{time}，操作者 {id}）与 r{b}（{time}，操作者 {id}）。 |
| system | 系统 |
| Revisions r{a} and r{b} have identical content. | 修订版 r{a} 与 r{b} 内容完全一致。 |
| Identity / Solution formulation / Layer process / Perovskite deposition process（分组） | 标识 / 溶液配方 / 层工艺 / 钙钛矿沉积工艺 |
| added / removed / changed | 新增 / 删除 / 修改 |

### 预设差异行标签（presetDiff）

| English | 中文 |
|---|---|
| Layer name / Layer type / Role / Source key | 层名称 / 层类型 / 角色 / 源键 |
| Formulation type / Stock dispersion / Stock volume | 配方类型 / 原液 / 原液体积 |
| Solid {n} · Chemical / Solid {n} · Weight | 固体 {n} · 化学品 / 固体 {n} · 质量 |
| Solvent {n} · Name / Solvent {n} · Volume | 溶剂 {n} · 名称 / 溶剂 {n} · 体积 |
| Process method | 工艺方法 |
| Spin stage {n} · Speed / Duration / Acceleration | 旋涂阶段 {n} · 转速 / 时长 / 加速度 |
| Annealing stage {n} · Temperature / Duration | 退火阶段 {n} · 温度 / 时长 |
| Sputter mode / Power / Pressure / Gas 1 / Gas 1 flow / Gas 2 / Gas 2 flow / Duration / Thickness / Rate / Substrate temperature / Cycles | 溅射模式 / 功率 / 压强 / 气体 1 / 气体 1 流量 / 气体 2 / 气体 2 流量 / 时长 / 厚度 / 速率 / 基底温度 / 循环数 |
| Deposition method | 沉积方法 |
| Deposition · Spin stage {n} · Speed / Duration / Acceleration | 沉积 · 旋涂阶段 {n} · 转速 / 时长 / 加速度 |
| Evacuation stage {n} · Valve / Pressure / Duration | 抽真空阶段 {n} · 阀门 / 压强 / 时长 |
| Gas-backfill stage {n} · Gas / Flow / Target pressure / Hold time | 气体回填阶段 {n} · 气体 / 流量 / 目标压强 / 保持时间 |
| Program order · Step {n} | 程序顺序 · 步骤 {n} |
| Deposition · Annealing stage {n} · Temperature / Duration | 沉积 · 退火阶段 {n} · 温度 / 时长 |
| (empty text) / yes / no | （空文本）/ 是 / 否 |

## 17. 基线

| English | 中文 |
|---|---|
| Loading baselines… | 正在加载基线… |
| Unable to load baselines. | 无法加载基线。 |
| Baselines | 基线 |
| Complete Control reference recipes used as experiment starting points. Personal baselines belong to their owner; Shared baselines are lab-wide. | 用作实验起点的完整对照参考配方。个人基线归其所有者所有；共享基线为全实验室共用。 |
| Create baseline | 创建基线 |
| Assemble a new baseline from reusable materials, device layouts, and layer presets. | 用可复用材料、器件布局与层预设组装新基线。 |
| Instructor and administrator creation is Shared (a lab-wide starting point). | 导师与管理员创建的是共享基线（全实验室起点）。 |
| Student creation is Personal and visible only to you until an instructor promotes it to Shared. | 学生创建的是个人基线，仅自己可见，直到导师将其提升为共享。 |
| Shared baselines / Personal baselines | 共享基线 / 个人基线 |
| No {group title} are available. | 暂无可用{group title}。 |
| Baseline saved as {Shared|Personal} with a complete versioned snapshot. | 基线已保存为{共享|个人}，含完整版本化快照。 |
| A new immutable baseline revision was saved. | 新的不可变基线修订版已保存。 |
| Unable to revise the baseline. | 无法修订基线。 |
| Unable to promote the baseline. | 无法提升基线。 |
| Unable to archive the baseline. | 无法归档基线。 |
| Baseline promoted to Shared. The original owner remains recorded as provenance. | 基线已提升为共享。原所有者仍记录为溯源信息。 |
| Baseline archived. Existing snapshots remain unchanged. | 基线已归档。已有快照保持不变。 |
| This baseline has no complete deposition process and cannot be revised. | 该基线没有完整的沉积工艺，无法修订。 |
| personal / shared | 个人 / 共享 |
| Owned by {owner} / Shared · originating owner {owner} / Shared · created directly by staff | 归 {owner} 所有 / 共享 · 原所有者 {owner} / 共享 · 由教职工直接创建 |
| · Promoted by {name} on {time}{ · note} | · 由 {name} 于 {time} 提升{ · 备注} |
| You / {display_name} / user {id} / — | 您 / {display_name} / 用户 {id} / — |
| Promote to shared | 提升为共享 |
| Promotion note for {name} (optional) | {name} 的提升备注（可选） |
| Promote {name} to shared | 将 {name} 提升为共享 |
| Revise baseline | 修订基线 |
| Archive {name} | 归档 {name} |
| Archive baseline | 归档基线 |
| Existing experiments and versions retain their complete snapshots. This baseline will no longer be available to students for new plans. | 已有实验与版本保留其完整快照。该基线将不再供学生用于新计划。 |
| Loading authoring catalogs… | 正在加载编写目录… |
| Unable to load authoring catalogs / The materials, presets, or device layouts could not be loaded. | 无法加载编写目录 / 材料、预设或器件布局加载失败。 |
| New baseline name / Baseline name | 新基线名称 / 基线名称 |
| Baseline scope | 基线范围 |
| The server fixes the scope from your role; the baseline cannot be changed to the other scope later. | 服务器根据您的角色固定范围；基线之后无法再改为另一种范围。 |
| Shared (lab-wide starting point) / Personal (visible only to you) | 共享（全实验室起点）/ 个人（仅自己可见） |
| Complete recipe: each layer and the Perovskite deposition process snapshot are complete. | 配方完整：每层与钙钛矿沉积工艺快照均已完整。 |
| {n} review items remain before this baseline can be saved. | 该基线保存前还剩 {n} 项待检查。 |
| Saving… / Save new revision / Save shared baseline / Save personal baseline | 保存中… / 保存新修订版 / 保存共享基线 / 保存个人基线 |
| Unable to create the baseline. | 无法创建基线。 |
| Unable to apply the device layout. | 无法应用器件布局。 |
| Baseline fabrication procedure | 基线制备流程 |
| Complete independently editable target snapshot | 完整独立可编辑目标快照 |

## 18. 器件布局

| English | 中文 |
|---|---|
| Loading device layouts… | 正在加载器件布局… |
| Unable to load device layouts. | 无法加载器件布局。 |
| Device layouts | 器件布局 |
| Versioned substrate geometry used to calculate physical devices and active area. Students cannot plan experiments until at least one layout exists. | 用于计算物理器件与有效面积的版本化基底几何。至少存在一个布局后学生才能规划实验。 |
| Administrator-managed catalog / Read-only reference catalog | 管理员维护的目录 / 只读参考目录 |
| Create a device layout | 创建器件布局 |
| Layout rows are immutable. To change a geometry, create a new row with the same code and a bumped version — historical conditions keep their original layout. Students see every code at its latest version. | 布局行不可变。要修改几何，请用相同编号新建一行并提升版本——历史条件保留其原布局。学生看到每个编号的最新版本。 |
| Code | 编号 |
| Short stable identifier, e.g. 15x15_dual_005. | 简短稳定的标识符，例如 15x15_dual_005。 |
| Version | 版本 |
| Substrate width (mm) / Substrate length (mm) / Devices per substrate / Active area per device (cm²) / Total active area (cm²) / Description | 基底宽度 (mm) / 基底长度 (mm) / 每基底器件数 / 每器件有效面积 (cm²) / 总有效面积 (cm²) / 描述 |
| Creating… / Create layout | 创建中… / 创建布局 |
| Device layout {code} v{v} created. | 器件布局 {code} v{v} 已创建。 |
| Unable to create the device layout. | 无法创建器件布局。 |
| Device layout directory | 器件布局目录 |
| Layout / Substrate / Devices / Area / device / Total active area / Version（表头） | 布局 / 基底 / 器件 / 面积/器件 / 总有效面积 / 版本 |
| {w} × {l} mm / {a} cm² / v{n} | {w} × {l} mm / {a} cm² / v{n} |
| No device layouts exist yet. / Students cannot plan experiments until you create the first layout above. | 尚无器件布局。/ 您在上方创建第一个布局后，学生才能规划实验。 |
| No device layouts are available. / Ask your administrator to create the device layouts. | 暂无可用器件布局。/ 请管理员创建器件布局。 |

## 19. 用户管理

| English | 中文 |
|---|---|
| Loading accounts… | 正在加载账户… |
| Unable to load accounts. | 无法加载账户。 |
| User administration | 用户管理 |
| Create local accounts, control role-based access, and reset passwords. | 创建本地账户、控制基于角色的访问并重置密码。 |
| Create account | 创建账户 |
| Username / Display name / Temporary password / Role | 用户名 / 显示名称 / 临时密码 / 角色 |
| Use at least 12 characters. | 至少使用 12 个字符。 |
| Student / Instructor / Administrator | 学生 / 导师 / 管理员 |
| Creating… / Create account | 创建中… / 创建账户 |
| Account created. | 账户已创建。 |
| Unable to create the account. | 无法创建账户。 |
| Accounts | 账户 |
| No accounts are available. | 暂无可用账户。 |
| User accounts | 用户账户 |
| User / State / Access / Password reset / Activity（表头） | 用户 / 状态 / 权限 / 密码重置 / 活动 |
| active / inactive（chip） | 启用 / 停用 |
| Active / Inactive（文本） | 启用 / 停用 |
| Role for {username} | {username} 的角色 |
| Active account for {username} | {username} 的启用账户 |
| Active（复选框） | 启用 |
| Save access for {username} | 保存 {username} 的权限 |
| Account access updated. | 账户权限已更新。 |
| Unable to update account access. | 无法更新账户权限。 |
| New password for {username} | {username} 的新密码 |
| Reset password for {username} | 重置 {username} 的密码 |
| Password reset for {username}. | {username} 的密码已重置。 |
| Unable to reset the password. | 无法重置密码。 |
| Last login / Password changed / Locked until | 上次登录 / 密码修改时间 / 锁定至 |

## 20. 版本历史（通用组件）

| English | 中文 |
|---|---|
| Version history | 版本历史 |
| Loading versions… | 正在加载版本… |
| Unable to load version history. | 无法加载版本历史。 |
| No revisions are available. | 暂无可用修订版。 |
| Revision {n} | 修订版 {n} |
| schema {n} / actor {id} / system | 数据结构版本 {n} / 操作者 {id} / 系统 |
| Inspect snapshot | 查看快照 |

## 21. 跨模块通用词汇

| English | 中文 |
|---|---|
| Save / Cancel / Confirm / Retry / Remove / Edit | 保存 / 取消 / 确认 / 重试 / 移除 / 编辑 |
| Back to records / Back to plan / Back to library / Back to directory | 返回记录 / 返回计划 / 返回库 / 返回目录 |
| Export JSON / Export PDF | 导出 JSON / 导出 PDF |
| View all / View details | 查看全部 / 查看详情 |
| Loading… / Loading {noun}… | 加载中… / 正在加载{noun}… |
| Unable to load {noun}. | 无法加载{noun}。 |
| Unable to save the {noun}. | 无法保存{noun}。 |
| No {noun} yet. / No {noun} are available. | 暂无{noun}。/ 暂无可用{noun}。 |
| Not recorded / None recorded / Not selected / Not available | 未记录 / 无记录 / 未选择 / 不可用 |
| —（占位符 em-dash） | —（保持不变） |

### 状态词汇（StatusBadge，下划线转空格显示）

| English | 中文 |
|---|---|
| draft | 草稿 |
| planned | 已计划 |
| preparing | 准备中 |
| ready | 就绪 |
| in progress | 进行中 |
| running | 运行中 |
| completed | 已完成 |
| consumed | 已消耗 |
| cancelled | 已取消 |
| failed | 失败 |
| pending | 待处理 |
| pending approval | 待审批 |
| approved | 已批准 |
| released | 已发布 |
| active | 进行中 / 已启用 / 可用（按对象，见核心术语校对记录） |
| inactive | 已停用 |
| archived | 已归档 |
| closed | 已关闭 |
| suggested | 建议 |
| excluded | 已排除 |
| discarded | 已废弃 |
| error | 错误 |
| critical | 严重 |
| assigned | 已关联 |
| unassigned | 未关联 |
| awaiting measurements | 等待测量 |
| manual review | 人工复核 |

### 角色 / 计划类型 / 条件角色 / 其他枚举

| English | 中文 |
|---|---|
| Student / Instructor / Administrator | 学生 / 导师 / 管理员 |
| comparative / standalone（计划类型） | 对比 / 独立 |
| control / target / standalone（条件角色） | 对照 / 目标 / 独立 |
| Forward / Reverse（扫描方向） | 正向 / 反向 |
| general / fabrication_shortfall / measurement_shortfall（偏差类型） | 一般 / 制备不足 / 测量不足 |
| info / warning / error / critical（严重程度） | 提示 / 警告 / 错误 / 严重 |
| shared / personal（范围） | 共享 / 个人 |
| p-i-n (inverted: HTL on substrate) / n-i-p (regular: ETL on substrate) | p-i-n（反式：HTL 在基底上）/ n-i-p（正式：ETL 在基底上） |

### 配色方案名称

| English | 中文 |
|---|---|
| Standalone J–V (orange / teal) | Standalone J–V（橙 / 青） |
| Nature Classic | Nature 经典 |
| Science / Paul Tol | Science / Paul Tol |
| Lancet Clinical | Lancet 临床 |
| NEJM Palette | NEJM 配色 |
| RdYlGn | RdYlGn（ColorBrewer 配色名，保持原文） |
| Nature warm | Nature 暖色 |
| Science deep purple | Science 深紫 |
| Lancet deep blue | Lancet 深蓝 |
| NEJM medical red | NEJM 医学红 |
| Cell blue-dominant | Cell 蓝主导 |
| Wong bright orange | Wong 亮橙 |
| Viridis | Viridis（保持原文） |
| Diverging red-blue | 发散红-蓝 |
| Medical grayscale | 医学灰度 |
| Rainbow red-to-blue | 彩虹红到蓝 |

### 不翻译项（保持英文/缩写）

- 单位：rpm、s、min、h、d、°C、Pa、sccm、mL、mg、W、nm、Å/s、rpm/s、mm、cm²、mA/cm²、mA cm⁻²、V、%、bytes、MB
- 化学药品与材料名：NiOx、SAM、PEAI、EDADI、PCBM、C60、BCP、SnO2、Ag、SiO₂、Perovskite（"Perovskite"作为层类型名保持英文；叙述性文字中的"钙钛矿"用中文）
- 性能指标缩写：Voc、Jsc、FF、PCE、J–V、J-V
- 角色缩写：HTL、ETL
- 器件结构：p-i-n、n-i-p
- 配色键名：science-tol、nature-classic、lancet-clinical、nejm
- 文件格式：CSV、JSON、PDF、SVG、TIFF
- 哈希：SHA-256
- 阀门代号：VV03、VV06 等设备编号
- 射频/直流：RF、DC、Pulsed DC
- ALD、VCD、MFC、CAS 等缩写

---

## 统计

- 编号章节：22 节（0–21，不含核心术语校对记录）。章节数量不代表源码覆盖率。
- 原始清单估计去重后词条约 **950–1000** 条（模板字符串按一条计）；尚未通过程序核对去重数量及遗漏，不能作为完整覆盖的验收依据。
- 本表按模块整理；通用词汇（第 21 节）在各模块中不重复列出，做 i18n 资源文件时应抽取为共享命名空间。

## 设备预约（booking.*）

复用应用语言状态；设备名称、公告正文、备注及材料名称保留原值。Equipment = 设备，Device = 器件。时间按 Asia/Shanghai，单位随台账快照保存。

| Key | English | 中文 |
|---|---|---|
| booking.title | Equipment booking | 设备预约 |
| booking.description | Shared laboratory calendar · Asia/Shanghai (UTC+08:00) | 共享实验室日历 · 上海时区（UTC+08:00） |
| booking.day | Day | 日 |
| booking.week | Week | 周 |
| booking.month | Month | 月 |
| booking.today | Today | 今天 |
| booking.previous | Previous period | 上一时段 |
| booking.next | Next period | 下一时段 |
| booking.date | Calendar date | 日历日期 |
| booking.equipment | Equipment | 设备 |
| booking.all | Select all | 全选 |
| booking.none | Clear selection | 清空选择 |
| booking.gloveboxes | Gloveboxes | 手套箱 |
| booking.vacuum | Vacuum deposition | 真空镀膜 |
| booking.other | Other processes | 其他工序 |
| booking.characterization | Characterization | 表征 |
| booking.closed | Reservations paused | 暂停预约 |
| booking.new | New booking | 新建预约 |
| booking.starts | Start (Shanghai time) | 开始（上海时间） |
| booking.ends | End (Shanghai time) | 结束（上海时间） |
| booking.create | Book equipment | 预约设备 |
| booking.saved | Saved. | 已保存。 |
| booking.empty | No reservations in this selection. | 当前筛选下没有预约。 |
| booking.selectEquipment | Select equipment to view its calendar. | 选择设备以查看日历。 |
| booking.planned | Reserved | 已预约 |
| booking.in_use | In use | 进行中 |
| booking.completed | Completed | 已完成 |
| booking.blocked | Maintenance | 维护封锁 |
| booking.cancelled | Cancelled | 已取消 |
| booking.no_show | No-show | 爽约 |
| booking.released | Released | 已解除 |
| booking.history | Include cancelled / no-show / released in history | 历史记录包含取消、爽约和已解除维护 |
| booking.historyTitle | Reservation history | 预约历史 |
| booking.person | Reserved by | 预约人 |
| booking.details | Reservation {id} | 预约 {id} |
| booking.start | Start use | 开始使用 |
| booking.endLater | End use, fill in later | 结束使用，稍后补填 |
| booking.submitEnd | Submit and end use | 提交并结束使用 |
| booking.cancel | Cancel booking | 取消预约 |
| booking.reschedule | Reschedule | 调整时间 |
| booking.usage | Usage ledger | 使用台账 |
| booking.pending | Pending completion | 待补填 |
| booking.ledger | My usage records | 我的使用记录 |
| booking.pendingOnly | Pending records only | 仅待补填 |
| booking.draft | Draft | 草稿 |
| booking.submitted | Submitted | 已提交 |
| booking.saveDraft | Save draft | 保存草稿 |
| booking.submit | Submit usage record | 提交台账 |
| booking.notes | Notes (optional) | 备注（选填） |
| booking.usageText | Usage | 使用情况 |
| booking.before_h2o | H₂O before use | 使用前 H₂O |
| booking.after_h2o | H₂O after use | 使用后 H₂O |
| booking.before_o2 | O₂ before use | 使用前 O₂ |
| booking.after_o2 | O₂ after use | 使用后 O₂ |
| booking.before_temperature | Temperature before use | 使用前温度 |
| booking.after_temperature | Temperature after use | 使用后温度 |
| booking.material | Deposition material | 沉积材料 |
| booking.cycles | Cycle number | 循环次数 |
| booking.initial_temperature | Initial process temperature | 起始工艺温度 |
| booking.chamber_pressure | Chamber pressure | 腔体压强 |
| booking.vacuumValue | Deposition vacuum | 镀膜真空度 |
| booking.thickness | Thickness | 厚度 |
| booking.layers | Deposited layers | 沉积膜层 |
| booking.addLayer | Add layer | 添加膜层 |
| booking.removeLayer | Remove layer {n} | 删除膜层 {n} |
| booking.snapshot | Template {template} · version {version}. Units are saved with this record. | 模板 {template} · 版本 {version}。单位随本记录保存。 |
| booking.notices | Equipment notices | 设备公告 |
| booking.noNotices | No current notices for the selected equipment. | 所选设备暂无有效公告。 |
| booking.pinned | Pinned | 置顶 |
| booking.inbox | Inbox | 站内通知 |
| booking.read | Mark as read | 标记已读 |
| booking.readAlready | Read | 已读 |
| booking.unread | Unread | 未读 |
| booking.reservation_cancelled | Your reservation {id} was cancelled by a manager. | 管理员已取消您的预约 {id}。 |
| booking.equipment_notice | Equipment notice {id} | 设备公告 {id} |
| booking.open | Open | 查看 |
| booking.private | Usage details are visible only to the owner, equipment manager and system administrator. | 详细台账仅本人、对应设备管理员及系统管理员可见。 |
| booking.noInbox | No notifications. | 暂无通知。 |
| booking.refresh | Refresh calendar | 刷新日历 |
| booking.occupied | {n} reservations | {n} 条预约 |
| booking.hours | {n} occupied h | 占用 {n} 小时 |
| booking.loadError | Unable to load booking data. Retry to refresh. | 无法加载预约数据，请重试刷新。 |
| booking.conflict | This action conflicts with the current equipment state or another reservation. Refresh and review the time or status before retrying. | 操作与设备当前状态或其他预约冲突。请刷新并核对时段或状态后重试。 |
| booking.denied | You do not have permission for this equipment or record. | 您没有此设备或记录的操作权限。 |
| booking.invalid | Check the required fields, numeric values and time interval. End must be after start; new bookings must be in the future. | 请核对必填字段、数值和时段。结束须晚于开始，新预约不能早于当前时间。 |
| booking.failed | Unable to save. Your form is preserved; retry after checking your connection. | 保存失败。表单内容已保留，请检查连接后重试。 |
| booking.endHint | Ending use preserves the original reserved time. Pending records do not prevent future bookings. | 结束使用保留原预约时段。待补填不会阻止后续预约。 |
| booking.actualStart | Actual start | 实际开始 |
| booking.actualEnd | Actual end | 实际结束 |
| booking.reason | Reason | 原因 |
| booking.manage | Equipment management | 设备管理 |
| booking.glovebox | Glovebox environment | 手套箱环境 |
| booking.ald | ALD | ALD |
| booking.evaporation | Thermal evaporation | 热蒸发 |
| booking.general | General usage | 通用使用 |
