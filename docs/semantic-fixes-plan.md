# 数据语义修复方案：审批绑定 · 训练导出口径 · 实验单位

依据：2026-10-05 全库第一性原理审查（Astra）及本仓库代码逐条复核。三个发现均已在
代码确认属实（引用见各节）。本方案只覆盖审查第 5 节 A/B/C；维护改进（审查第 4 项）
与自动 BO（第 5 项）不在范围内。

状态：**已拍板（2026-10-06）**，按 §0 决定实施。

## 0. 决策点

| # | 决策点 | 选项 | 决定 |
|---|---|---|---|
| D1 | 审批绑定机制 | 1A 修订号 / 1B 内容摘要 / 1C 不可变 PlanRevision 表 | **1B 内容摘要** |
| D2 | 审批证据存放 | 2A 审计事件 details / 2B 独立 plan_approvals 表 | **2A 审计事件 details** |
| D3 | 重测代表值规则 | 3A 可配、默认最新 / 3B 固定最新 / 3C 固定均值 | **3A 可配、默认最新** |
| D4 | 实验单位处理 | 4A 固定基底聚合 / 4B 声明式受限置换 / 4C 暂停输出 p 值 | **4A 固定基底聚合** |
| D5 | 409 后前端交互 | 5A 内联警示条 / 5B 模态框 | 5A 内联警示条（按推荐执行） |
| D6 | 比较块处置 | 修正保留（方案 C）/ 整体移除 | **修正保留（方案 C）** |
| D7 | 方案 B 时机 | 纳入本轮实施 / 推迟到训练/BO 前 | **纳入本轮实施** |

**补充决定（2026-10-06，随出处考证更新）：**

- **B 的时机推迟**：训练导出唯一入口是 admin_cli、属派生物（原始扫描与
  assignment 全部持久保留，随时可重推导），推迟无信息损失。实施窗口挂在
  **首次训练 / BO 启动前**，届时按 D3 口径实现；过渡期可在 admin_cli 导出处
  加一行 v1 口径警告作为护栏。
- **C 确认执行（修正保留）**：出处考证发现 p 值并非独立需求，而是 2026-07-22
  提交 `634488a` "feat: guide experiment setup and result analysis" 随功能包
  带入（旧版服务端 UI 曾显示，React 重写后仅存后端与导出）。曾评估"整体移除
  比较块"：因 effect_size 分母同样受伪重复污染（要动就该整块处理），且将来
  分析工作台可能需要条件对比，仍选修正保留。UI 展示的描述统计两条路都不碰。
- **更新（2026-10-06，D7）**：B 也纳入本轮实施，§2 与 §4 中的推迟安排作废。

**三个方案均不需要数据库迁移**（1B 的摘要是派生值、存入现有审计 JSON；B 是导出
逻辑；C 是计算逻辑）。0017 号迁移位保留不用。

## 1. 方案 A：审批绑定审查者看到的内容

### 1.1 问题与代码事实

- 审批请求载荷只有 `status` 一个字段（`src/web/models.py:694`）；事务内校验角色、
  状态机、条件完整性、批次守卫，全部对照数据库**当前**状态
  （`apply_plan_status_update`，`src/web/repository/condition.py:966`）。
- 洞的确切位置：**新增条件时计划保持 pending_approval**（`apply_condition_create`
  docstring，`condition.py:629-631` "keeps pending-approval mid-review"；仅
  released/in_progress/completed/cancelled 被拒，`condition.py:656-662`）。于是：
  审查者读到 2 条条件 → 第三人新增第 3 条（状态仍 pending_approval）→ 审查者点击
  批准 → 204。
- 修改/删除条件会重置回 draft（`condition.py:894`、`954`），但"重置 → 重新提交
  pending_approval"可以全部发生在审查者读取与点击之间，陈旧视图窗口依然存在。
  **单靠状态机修复不了，必须把审批绑定到内容。**
- 已有先例可直接复用：条件快照带规范化哈希 `canonical_hash`
  （`src/web/condition_snapshot.py:157`，SHA-256 over sort_keys 紧凑 JSON）；基底
  例外批准时已校验 `approved_condition_hash` 是否等于当前条件哈希
  （`condition.py:190`）。方案 A 就是把这个模式提升到"整个计划的审批范围"。

### 1.2 D1：绑定机制

| | 1A 修订号 | 1B 内容摘要（推荐） | 1C 不可变 PlanRevision |
|---|---|---|---|
| 机制 | `experiments` 加 `plan_revision` 列，每个范围改动路径 +1；审批回传 `expected_revision` | 服务端从当前数据派生"审批范围"规范 JSON 的 SHA-256；GET 响应携带摘要，审批回传 `expected_approval_digest` | 每次范围变更落一条完整快照 revision 行，审批绑定 revision id |
| 漏洞风险 | 依赖每个修改路径记得 bump（现有 5+ 条路径，未来新增路径可能漏）；**漏一处即静默重开漏洞** | 从当前状态派生，结构上不可能漏；剩余风险只有"范围定义本身漏字段"，而范围是单点定义的函数 | 最低 |
| 迁移 | 0017 加列 + 回填 | 无 | 新表 + 快照写入 + API 面扩大 |
| 审批证据 | 修订号不含内容信息，作证据仍需另存摘要 | 摘要本身就是"批准了什么"的证据 | 完整快照，最强 |
| 成本 | 低 | 低–中 | 高 |

推荐 **1B**：审批失效的判定对象就是"内容"，从内容派生校验值在结构上无遗漏路径；
哈希惯例与例外审批先例一致；摘要直接满足审查报告"审批记录保存批准版本"的要求。
1A 表面更简单，但把正确性寄托在未来的纪律上，且失败是静默的。1C 留给确有"回看
任意历史版本审批范围"需求时再引入。

### 1.3 审批范围定义（选 1B 时）

新纯函数 `approval_scope_digest(connection, experiment_id) -> str`：对规范化 JSON
（sort_keys、紧凑分隔符，同 `condition_snapshot` 惯例）取 SHA-256，内容：

- `plan_type`；
- 每条条件：`condition_code`、`name`、`role`、`canonical_hash`、
  `planned_substrate_count`、`device_layout_code`；
- 每条已批准例外：`condition_id`、`requested_count`。

明确不含：实验标题、notes、时间戳、操作者——避免无关编辑触发 409。

接线：

1. 实验详情响应增加 `approval_scope_digest` 字段；
2. `PlanStatusUpdatePayload` 增加 `expected_approval_digest`
   （`src/web/models.py:694`）；
3. `apply_plan_status_update` 在行锁内重算摘要并比对
   （`condition.py:966`）：仅 **pending_approval → approved**（批准动作）要求必填，
   缺失返回 400；不匹配抛新错误类 `StalePlanScope` → HTTP 409
   （`src/web/operations/errors.py` 增加类，`_operation_error_to_http` 增加映射，
   目前全库无 409 先例）；
4. 其余状态转换不校验摘要——提交、发布者不是在"批准内容"。

### 1.4 D2：审批证据

- **2A（推荐）**：现有审计事件 `plan.status_change`（`condition.py:1014`）的
  details 增加 `approval_scope_digest` 与 `expected_approval_digest`。事务内一致、
  零迁移，操作者与 IP 审计里已有。
- 2B：`plan_approvals` 表（experiment_id, decision, decided_by, decided_at,
  scope_digest, note）。可查询、未来可做审批历史 UI；当前无此需求，需要 0017。

无论选哪个，现有审计事件照记（行为不变）。

### 1.5 D5：409 后的前端交互（`frontend/src/pages/ExperimentDetailPage.tsx:111`）

现状：`changePlanStatus` POST 成功后乐观更新本地状态；错误统一进 `actionError`。

选 **5A（推荐）**：apiFetch 暴露状态码（或对 409 抛特定错误类型）；捕获 409 →
重新拉取 detail + 内联警示条（复用现有 `inline-warning` 样式先例，见
`ExperimentDetailPage.tsx:231`）：

```
┌──────────────────────────────────────────────┐
│ ⚠ 计划内容已更新，你刚才审查的版本已过期。      │
│   页面已显示最新内容，请重新确认后再批准。      │
└──────────────────────────────────────────────┘
[Approve plan]（重新加载完成前保持禁用）
```

5B 模态框：强制两步确认，更重，信息量不比警示条多。

### 1.6 测试约定（先写探针场景为回归测试）

- 陈旧视图复现：pending_approval + 2 条件 → 新增第 3 条 → 旧摘要批准 → **409**
  （对应 Astra 探针 1）。
- 摘要覆盖：条件增/改/删、例外批准均改变摘要；改 notes 不改变。
- 正常路径：摘要匹配 → 204，审计 details 含摘要。
- 兼容：批准不带 `expected_approval_digest` → 400。
- 前端：409 → 警示条 + 重新拉取（React Testing Library）。

### 1.7 风险与兼容

- payload 新增字段对批准动作是破坏性变更：影响面仅此一个调用，前后端同 PR 同步改，
  演示环境可再生成。
- 误报方向是"多余的 409"（安全侧），不会漏放行。

## 2. 方案 B：训练导出——测量条目 ≠ 器件数

**时机：纳入本轮实施（D7），作为 PR-3。**

### 2.1 问题与代码事实

- `build_training_dataset`（`src/web/repository/admin.py:137`）遍历每条
  assignment，forward/reverse 各自成为一条样本（`admin.py:304-328`——方向拆分是
  schema 6 的有意设计），**跨文件/跨上传没有按 `fabrication_device_id` 归并**。
- 汇总 `extract_result_metrics`（`src/perovskite_bo/web_adapter.py:214`）的
  `device_count = len(usable)` 是方向条目数：一器件一次正反扫 → 2；重测 → 4；
  重测次数不同的器件获得不同目标权重。
- 文档已声明该债务（`docs/result-analysis.md:34`）；导出唯一入口是
  `src/web/admin_cli.py:281`，**无 Web 路由 → 修复无前端影响**。

### 2.2 目标口径（导出 schema v2）

- 行粒度：**每物理器件 × 每方向一行**（跨文件归并到 `fabrication_device_id`）。
- 新字段：`direction`、`fabrication_device_id`、`fabrication_substrate_id`、
  `fabrication_batch_id`、`measurement_count`（该器件该方向的重测次数）、
  `representative_rule`、`representative_source`（来源文件与上传时间）。
- 汇总（web_adapter v2）：`device_count` = 物理器件数、`scan_count` = 扫描条目数、
  按方向分列统计；`pce_mean` 等基于代表值集合。
- 计数分离：`n_batches` / `n_substrates` / `n_devices` / `n_scans` 全部显式输出
  （对应审查建议"分别报告"）。
- 版本标记：导出头部 `schema_version: 2`；`docs/result-analysis.md` 债务段改写为
  v2 口径说明。

### 2.3 D3：重测代表值规则

- **3A（推荐）**：CLI `--representative {latest,mean}`，默认 `latest`（器件"当前
  状态"语义，适配 BO 目标定义）；另有 `--keep-all-rows` 输出全部扫描行（附
  device/direction 列），由训练侧自行聚合，留作 BO 实验加权用。
- 3B 固定 latest：最简单；将来要均值时改代码。
- 3C 固定 mean：平滑重测差异，但掩盖时间结构（器件衰减/老化），对优化目标不友好。

不删除任何原始测量；`result_files.analysis` 不动。

### 2.4 测试约定

- 一器件一次正反扫 → `device_count=1`、`scan_count=2`（探针场景 2 前半）。
- 同器件重测后 → `device_count` 仍 1、`scan_count=4`、`measurement_count=2`、
  代表值 = 最新（探针场景 2 后半）。
- 多器件不同重测次数 → 目标权重不再随重测次数漂移。
- 口径变化本身记录在 CHANGELOG；不承诺与 v1 数值可比。

## 3. 方案 C：推断统计表达实验单位

### 3.1 问题与代码事实

- `_permutation_p_value`（`src/web/jv_parser.py:1365`）把每组每方向的器件值当作
  可交换集合，无基底/制备组结构；exact ≤20k 组合、否则 MC 5000。
- 数据模型里分组本来就按基底：`jv_parser.py:989-996` 给 substrate 赋 `group_id`、
  器件继承——**基底聚合所需信息在分析 JSON 内就有**。
- 复现：1 基底 × 6 器件、全 control=10 / target=11 → p = 2/C(12,6) ≈ 0.00216，
  四指标 BH 后 0.00866——处理施加在基底层时这是伪重复（p 值算术已在本仓库复核）。
- 暴露面：前端无页面渲染 p（仅类型 `frontend/src/types/api.ts:723` 与测试夹具）；
  p 随批次导出 JSON 流出（`src/web/plan_export.py:356`）。

### 3.2 D4：方案

- **4A（推荐）**：固定按基底聚合。每组每方向：器件值 → 按 `substrate_id` 聚合为
  基底均值 → 基底间置换（exact/MC 逻辑不变，只换条目集合）。任一侧基底数 <2：
  `p=None`，`test_method="insufficient independent units (substrates=N)"`，描述
  统计照旧。输出 JSON 增加 `inference_unit="substrate"` 与两侧
  `n_independent_units`；BH 校正只在可用 p 上进行（现有逻辑已按可用项过滤）。
- 4B：计划层声明实验单位（device/substrate/batch）+ Winkler 式分层受限置换。最
  严谨，需要迁移、UI 声明入口与更多验证；等出现"基底内随机化"的真实设计再上。
- 4C：单位机制落地前完全停止输出 p。最保守，但把尚能正确用于"处理确实施加于器件
  级"场景的信号一并丢掉。

推荐 **4A**：匹配钙钛矿常规设计（处理施加于基底），实现小、方向保守（聚合只会
减少伪显著），自动修正导出口径。范围边界要说清：本方案修正**单个分析内**的单位；
跨上传合并的推断等"可保存分析版本"（审查第 3 项）落地后再说。

### 3.3 UI 约束（现在就定）

- 在可保存分析版本落地之前，前端**不新增**渲染 p 值的卡片；`api.ts` 类型保持不动。
- 批次导出自动携带新口径与 `inference_unit` 标注。

### 3.4 测试约定

- 1 基底 × 6 器件合成数据 → p=None 且注明原因（探针场景 3 回归）。
- ≥2 基底/组 → 与手算基底置换 p 对拍；BH 只在可用 p 上校正。
- 描述统计、方向拆分、排除逻辑不回归（现有 116 项测试保持绿）。

## 4. 实施顺序与 PR 切分

1. **PR-1 方案 A**：models / operations / repository / routes + 前端
   ExperimentDetailPage + 测试；无迁移。
2. **PR-2 方案 C**：jv_parser + 测试；无迁移。
3. **PR-3 方案 B（训练导出 v2）**：repository/admin.py + web_adapter +
   admin_cli + docs/result-analysis.md；无迁移。

每个 PR：feature branch → 手动触发 Actions Tests (Ubuntu) + Windows validation →
双绿后合并（仓库 2026-10-03 约定，CI 每 PR 一次）。

顺序理由：A 影响日常审批流、改动面最小；C 的比较块在上传时固化进库，趁真实
测量数据开始积累之前修正，避免将来写回填脚本；B 实现自包含（唯一入口
CLI），排最后不阻塞前两项。

## 5. 明确不做

- 不可变 PlanRevision 表（1C）、审批历史 UI（2B）——记录在案，待真实需求再上。
- 前端 p 值展示、可保存分析定义与 manifest（审查第 3 项）、分页/摘要端点、API
  类型生成、自动 BO（审查第 5 项）。
- 不删任何原始测量数据；不改冻结的 matplotlib 出版图管线；Apple 规范 / CSP /
  领域状态色不变。
