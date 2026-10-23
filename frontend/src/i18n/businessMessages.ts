/** Reviewed UI inventory: docs/ui-strings-en-zh.md. Keep keys stable when editing copy. */
export const businessMessages = {
  "completeBatchDialog.completeBatch": [
    "Complete batch",
    "完成批次"
  ],
  "completeBatchDialog.recordHowManySubstratesWereActuallyMadeInEach": [
    "Record how many substrates were actually made in each condition. A count below the planned number needs a deviation reason and counts of zero mean the whole group was abandoned.",
    "记录每个条件实际产出的基底数量。低于计划数需填写偏差原因；为零表示该组整体放弃。"
  ],
  "completeBatchDialog.planned": [
    " · planned ",
    " · 计划 "
  ],
  "completeBatchDialog.actualSubstrates": [
    "Actual substrates",
    "实际基底数"
  ],
  "completeBatchDialog.deviationReasonRequired": [
    "Deviation reason (required)",
    "偏差原因（必填）"
  ],
  "completeBatchDialog.cancel": [
    "Cancel",
    "取消"
  ],
  "conditionCard.schema": [
    "schema ",
    "数据结构版本 "
  ],
  "conditionCard.layout": [
    "Layout",
    "布局"
  ],
  "conditionCard.substrates": [
    "Substrates",
    "基底"
  ],
  "conditionCard.devices": [
    "Devices",
    "器件"
  ],
  "conditionCard.expectedDevices": [
    " expected devices",
    " 个预期器件"
  ],
  "conditionCard.source": [
    "Source",
    "来源"
  ],
  "conditionCard.baselineVersionId": [
    "Baseline version {id}",
    "基线版本 {id}"
  ],
  "conditionCard.standaloneSnapshot": [
    "Standalone snapshot",
    "独立快照"
  ],
  "conditionCard.advancedRawSnapshotsJSON": [
    "Advanced: raw snapshots (JSON)",
    "高级：原始快照（JSON）"
  ],
  "conditionCard.completeConditionSnapshot": [
    "Complete condition snapshot",
    "完整条件快照"
  ],
  "conditionCard.deviceLayoutSnapshot": [
    "Device layout snapshot",
    "器件布局快照"
  ],
  "conditionCard.substrateExceptionForName": [
    "Substrate exception for {name}",
    "{name} 的基底例外"
  ],
  "conditionCard.substrateException": [
    "Substrate exception",
    "基底例外"
  ],
  "conditionCard.decisionNote": [
    "Decision note: ",
    "决定备注： "
  ],
  "conditionCard.decisionNoteForName": [
    "Decision note for {name}",
    "{name} 的决定备注"
  ],
  "conditionCard.approveException": [
    "Approve exception",
    "批准例外"
  ],
  "conditionCard.rejectException": [
    "Reject exception",
    "驳回例外"
  ],
  "conditionCard.exceptionReasonForName": [
    "Exception reason for {name}",
    "{name} 的例外原因"
  ],
  "conditionCard.requestException": [
    "Request exception",
    "申请例外"
  ],
  "conditionCard.noActiveExceptionIsRecorded": [
    "No active exception is recorded.",
    "当前无生效的例外记录。"
  ],
  "conditionComparison.conditionComparison": [
    "Condition comparison",
    "条件对比"
  ],
  "conditionComparison.layersInFabricationOrderIdenticalLayersCollapsed": [
    "layers in fabrication order · identical layers collapsed",
    "按制备顺序排列的层 · 相同层已折叠"
  ],
  "conditionComparison.identical": [
    "identical",
    "相同"
  ],
  "conditionComparison.parameter": [
    "Parameter",
    "参数"
  ],
  "conditionComparison.reference": [
    " · reference",
    " · 参考"
  ],
  "deviceExclusionsPanel.deviceExclusions": [
    "Device exclusions",
    "器件排除"
  ],
  "deviceExclusionsPanel.manual": [
    " manual · ",
    " 手动 · "
  ],
  "deviceExclusionsPanel.thresholdMatches": [
    " threshold matches",
    " 个符合阈值条件"
  ],
  "deviceExclusionsPanel.automaticExclusionRequiresBothForwardAndReverseRepresentativeScans": [
    "Automatic exclusion requires both forward and reverse representative scans to fall below at least one enabled threshold. Each metric uses the same threshold in both directions; different metrics may trigger each direction. Devices with a missing direction need manual review. Threshold matches apply only to the current analysis view and are not saved. Manual reasons are saved and take priority. Exclusion never removes J–V curves or the underlying measurements.",
    "自动排除要求正向和反向代表性扫描都低于至少一个启用的阈值。每个指标在两个方向使用同一阈值；不同指标可分别触发各方向。缺少某一方向的器件需人工复核。阈值匹配仅作用于当前分析视图且不会被保存。手动原因会被保存并优先生效。排除不会删除 J–V 曲线或底层测量数据。"
  ],
  "deviceExclusionsPanel.vocBelowV": [
    "Voc below (V)",
    "Voc 低于 (V)"
  ],
  "deviceExclusionsPanel.flagDevicesWithVocBelowV": [
    "Flag devices with Voc below (V)",
    "标记 Voc 低于以下值的器件 (V)"
  ],
  "deviceExclusionsPanel.pceBelow": [
    "PCE below (%)",
    "PCE 低于 (%)"
  ],
  "deviceExclusionsPanel.flagDevicesWithPCEBelow": [
    "Flag devices with PCE below (%)",
    "标记 PCE 低于以下值的器件 (%)"
  ],
  "deviceExclusionsPanel.ffBelow": [
    "FF below (%)",
    "FF 低于 (%)"
  ],
  "deviceExclusionsPanel.flagDevicesWithFFBelow": [
    "Flag devices with FF below (%)",
    "标记 FF 低于以下值的器件 (%)"
  ],
  "deviceExclusionsPanel.applyThresholds": [
    "Apply thresholds",
    "应用阈值"
  ],
  "deviceExclusionsPanel.clearThresholdFilter": [
    "Clear threshold filter",
    "清除阈值筛选"
  ],
  "deviceExclusionsPanel.clearManualExclusions": [
    "Clear manual exclusions",
    "清除手动排除"
  ],
  "deviceExclusionsPanel.device": [
    "Device",
    "器件"
  ],
  "deviceExclusionsPanel.substrate": [
    "Substrate",
    "基底"
  ],
  "deviceExclusionsPanel.group": [
    "Group",
    "分组"
  ],
  "deviceExclusionsPanel.excludeId": [
    "Exclude {id}",
    "排除 {id}"
  ],
  "deviceExclusionsPanel.thresholdMatch": [
    "Threshold match",
    "阈值匹配"
  ],
  "deviceExclusionsPanel.unassigned": [
    "Unassigned",
    "未关联"
  ],
  "deviceExclusionsPanel.exclusionReasonForId": [
    "Exclusion reason for {id}",
    "{id} 的排除原因"
  ],
  "deviceMultiSelect.chooseDevices": [
    "Choose devices (",
    "选择器件（"
  ],
  "deviceMultiSelect.selected": [
    " selected)",
    " 已选）"
  ],
  "deviceMultiSelect.searchDevices": [
    "Search devices",
    "搜索器件"
  ],
  "deviceMultiSelect.deviceSubstrate": [
    "Device / substrate…",
    "器件 / 基底…"
  ],
  "deviceMultiSelect.chooseDeviceId": [
    "Choose device {id}",
    "选择器件 {id}"
  ],
  "deviceMultiSelect.excludedFromStatistics": [
    " (excluded from statistics)",
    " （已从统计中排除）"
  ],
  "deviceMultiSelect.noMatchingDevices": [
    "No matching devices.",
    "没有匹配的器件。"
  ],
  "deviceScanHistoryPanel.deviceScanHistory": [
    "Device scan history",
    "器件扫描历史"
  ],
  "deviceScanHistoryPanel.device": [
    " device",
    " 器件"
  ],
  "deviceScanHistoryPanel.unableToLoadScanHistoryForDevice": [
    "Unable to load scan history for device ",
    "无法加载以下器件的扫描历史： "
  ],
  "deviceScanHistoryPanel.loadingScanHistory": [
    "Loading scan history…",
    "正在加载扫描历史…"
  ],
  "deviceScanHistoryPanel.noValid": [
    "No valid ",
    "暂无有效的 "
  ],
  "deviceScanHistoryPanel.scanOnRecord": [
    " scan on record.",
    " 扫描记录。"
  ],
  "deviceScanHistoryPanel.forward": [
    "Forward",
    "正向"
  ],
  "deviceScanHistoryPanel.reverse": [
    "Reverse",
    "反向"
  ],
  "deviceScanHistoryPanel.best": [
    " best",
    " 最佳"
  ],
  "deviceScanHistoryPanel.userChoice": [
    "user choice",
    "用户选择"
  ],
  "deviceScanHistoryPanel.bestPCE": [
    "best PCE",
    "最佳 PCE"
  ],
  "deviceScanHistoryPanel.clearChoice": [
    "Clear choice",
    "清除选择"
  ],
  "deviceScanHistoryPanel.from": [
    "From ",
    "来源 "
  ],
  "deviceScanHistoryPanel.measuredTime": [
    " · measured {time}",
    "· 测量于 {time}"
  ],
  "deviceScanHistoryPanel.allScans": [
    "All scans (",
    "所有扫描（"
  ],
  "deviceScanHistoryPanel.direction": [
    "Direction",
    "方向"
  ],
  "deviceScanHistoryPanel.measured": [
    "Measured",
    "测量时间"
  ],
  "deviceScanHistoryPanel.file": [
    "File",
    "文件"
  ],
  "deviceScanHistoryPanel.representative": [
    "Representative",
    "代表性"
  ],
  "deviceScanHistoryPanel.errorMsg": [
    "error: {msg}",
    "错误：{msg}"
  ],
  "deviceScanHistoryPanel.current": [
    "current",
    "当前"
  ],
  "deviceScanHistoryPanel.setAsRepresentative": [
    "Set as representative",
    "设为代表性"
  ],
  "deviceStackRail.deviceStack": [
    "Device stack",
    "器件堆叠"
  ],
  "deviceStackRail.substrate": [
    "substrate",
    "基底"
  ],
  "jvChart.publicationJVCurves": [
    "Publication J–V curves",
    "出版级 J–V 曲线"
  ],
  "jvChart.selectAll": [
    "Select all",
    "全选"
  ],
  "jvChart.plotSelected": [
    "Plot selected",
    "绘制所选"
  ],
  "jvChart.clear": [
    "Clear",
    "清除"
  ],
  "jvChart.selected": [
    " selected",
    " 已选"
  ],
  "jvChart.all": [
    " · all",
    " · 全部"
  ],
  "jvChart.colorPalette": [
    "Color palette ",
    "配色方案 "
  ],
  "jvChart.theFirst": [
    "The first ",
    "前 "
  ],
  "jvChart.selectedDevicesWillBePlotted": [
    " selected devices will be plotted.",
    " 个已选器件将绘制在图中。"
  ],
  "jvChart.nSelectedDeviceSShownClearToReturnTo": [
    "{n} selected device{s} shown. Clear to return to all devices.",
    "已显示 {n} 个所选器件。清除以返回全部器件。"
  ],
  "jvChart.showingEveryDeviceByGroupSelectDevicesAndChoose": [
    "Showing every device by group. Select devices and choose Plot selected for individual curves.",
    "正按分组显示全部器件。选择器件并点击\"绘制所选\"可查看单独曲线。"
  ],
  "jvChart.publicationJVCurvesForIds": [
    "Publication J-V curves for {ids}",
    "{ids} 的出版级 J-V 曲线"
  ],
  "jvChart.allDeviceJVCurvesByGroup": [
    "All-device J-V curves by group",
    "按分组的全器件 J-V 曲线"
  ],
  "jvChart.deviceMetrics": [
    "Device metrics ",
    "器件指标 "
  ],
  "jvChart.devices": [
    " devices",
    " 个器件"
  ],
  "jvChart.select": [
    "Select",
    "选择"
  ],
  "jvChart.scan": [
    "Scan",
    "扫描"
  ],
  "jvChart.validScans": [
    "Valid scans",
    "有效扫描"
  ],
  "jvChart.selectDeviceId": [
    "Select {device_id}",
    "选择 {device_id}"
  ],
  "jvChart.excluded": [
    "excluded",
    "已排除"
  ],
  "portfolioBoard.experimentPlan": [
    "Experiment plan",
    "实验计划"
  ],
  "portfolioBoard.awaitingRelease": [
    "Awaiting release",
    "待发布"
  ],
  "portfolioBoard.batchCreated": [
    "Batch created",
    "批次已创建"
  ],
  "portfolioBoard.awaitingBatch": [
    "Awaiting batch",
    "待建批次"
  ],
  "portfolioBoard.planning": [
    "Planning",
    "规划中"
  ],
  "portfolioBoard.approved": [
    "Approved",
    "已批准"
  ],
  "portfolioBoard.fabrication": [
    "Fabrication",
    "制备"
  ],
  "portfolioBoard.characterization": [
    "Characterization",
    "表征"
  ],
  "portfolioBoard.noRecords": [
    "No records",
    "暂无记录"
  ],
  "portfolioBoard.overH": [
    "Over 24 h",
    "超过 24 h"
  ],
  "portfolioBoard.batchBestForwardPCE": [
    "% batch best forward PCE",
    "% 批次最佳正向 PCE"
  ],
  "portfolioBoard.recordsInThePipelineAmberTextMarksPendingRecords": [
    " records in the pipeline · amber text marks pending records older than 24 h",
    " 条流程记录 · 琥珀色标记待处理超过 24 h 的记录"
  ],
  "publicationFigure.publicationFigureDownloads": [
    "Publication figure downloads",
    "出版级图表下载"
  ],
  "publicationFigure.download": [
    "Download",
    "下载"
  ],
  "publicationFigure.saveExclusionChangesBeforeDownloadingTheFilteredFigure": [
    "Save exclusion changes before downloading the filtered figure.",
    "下载筛选后图表前请先保存排除变更。"
  ],
  "publicationFigure.thePublicationFigureCouldNotBeGeneratedForThis": [
    "The publication figure could not be generated for this selection.",
    "无法为当前选择生成出版级图表。"
  ],
  "publicationFigure.pythonMatplotlibPreviewTheDownloadedSVGPDFAndTIFF": [
    "Python/Matplotlib preview. The downloaded SVG, PDF, and TIFF use the same data and layout.",
    "Python/Matplotlib 预览。下载的 SVG、PDF 和 TIFF 使用相同的数据与布局。"
  ],
  "recipeSnapshotSummary.junction": [
    "Junction",
    "结型"
  ],
  "recipeSnapshotSummary.bandgap": [
    "Bandgap",
    "带隙"
  ],
  "recipeSnapshotSummary.notRecorded": [
    "Not recorded",
    "未记录"
  ],
  "recipeSnapshotSummary.recipeSchema": [
    "Recipe schema",
    "配方数据结构"
  ],
  "recipeSnapshotSummary.perovskiteProcess": [
    "Perovskite process",
    "钙钛矿工艺"
  ],
  "runSheetTable.notRecorded": [
    "not recorded",
    "未记录"
  ],
  "runSheetTable.deviation": [
    "Deviation",
    "偏差"
  ],
  "runSheetTable.of": [
    " of ",
    " / "
  ],
  "runSheetTable.recordingProgress": [
    "{done} of {total} recorded",
    "已记录 {done} / {total}"
  ],
  "runSheetTable.recordAllAsPlanned": [
    "Record all as planned",
    "全部按计划记录"
  ],
  "runSheetTable.runSheetChecklist": [
    "Run sheet checklist",
    "制备记录单清单"
  ],
  "runSheetTable.step": [
    "Step",
    "步骤"
  ],
  "runSheetTable.detail": [
    "Detail",
    "详情"
  ],
  "runSheetTable.statusClickToCycle": [
    "Status — click to cycle",
    "状态——点击切换"
  ],
  "runSheetTable.recordDeviation": [
    "Record deviation",
    "记录偏差"
  ],
  "runSheetTable.category": [
    "Category",
    "类别"
  ],
  "runSheetTable.severity": [
    "Severity",
    "严重程度"
  ],
  "runSheetTable.whatChanged": [
    "What changed",
    "变更内容"
  ],
  "runSheetTable.eGSpinSpeedRpmInsteadOfRpm": [
    "e.g. spin speed 4000 rpm instead of 5000 rpm",
    "例如转速 4000 rpm 而非 5000 rpm"
  ],
  "runSheetTable.saving": [
    "Saving…",
    "保存中…"
  ],
  "runSheetTable.saveDeviation": [
    "Save deviation",
    "保存偏差"
  ],
  "snapshotEditor.weighedSolids": [
    "Weighed solids",
    "称量固体"
  ],
  "snapshotEditor.dilutedDispersion": [
    "Diluted dispersion",
    "稀释分散液"
  ],
  "snapshotEditor.selectValve": [
    "Select valve",
    "请选择阀门"
  ],
  "snapshotEditor.evacuate": [
    "Evacuate",
    "抽真空"
  ],
  "snapshotEditor.gasBackfill": [
    "Gas backfill",
    "气体回填"
  ],
  "snapshotEditor.moveNameUp": [
    "Move {name} up",
    "上移 {name}"
  ],
  "snapshotEditor.moveNameDown": [
    "Move {name} down",
    "下移 {name}"
  ],
  "snapshotEditor.addLabel": [
    "Add {label}",
    "添加{label}"
  ],
  "snapshotEditor.add": [
    "+ Add ",
    "+ 添加 "
  ],
  "snapshotEditor.removeLabelN": [
    "Remove {label} {n}",
    "移除{label} {n}"
  ],
  "snapshotEditor.remove": [
    "Remove",
    "移除"
  ],
  "versionHistory.versionHistory": [
    "Version history",
    "版本历史"
  ],
  "versionHistory.loadingVersions": [
    "Loading versions…",
    "正在加载版本…"
  ],
  "versionHistory.retry": [
    "Retry",
    "重试"
  ],
  "versionHistory.noRevisionsAreAvailable": [
    "No revisions are available.",
    "暂无可用修订版。"
  ],
  "versionHistory.revision": [
    "Revision ",
    "修订版 "
  ],
  "versionHistory.actor": [
    "actor ",
    "操作者 "
  ],
  "versionHistory.system": [
    "system",
    "系统"
  ],
  "versionHistory.inspectSnapshot": [
    "Inspect snapshot",
    "查看快照"
  ],
  "baselineAuthoring.loadingAuthoringCatalogs": [
    "Loading authoring catalogs…",
    "正在加载编写目录…"
  ],
  "baselineAuthoring.unableToLoadAuthoringCatalogs": [
    "Unable to load authoring catalogs",
    "无法加载编写目录"
  ],
  "baselineAuthoring.theMaterialsPresetsOrDeviceLayoutsCouldNotBe": [
    "The materials, presets, or device layouts could not be loaded.",
    "材料、预设或器件布局加载失败。"
  ],
  "baselineAuthoring.draftRestoredFromYourLastEditingSessionYourEntered": [
    "Draft restored from your last editing session. Your entered values are kept until you save or discard them.",
    "已恢复您上次编辑的草稿。所填内容将保留，直到您保存或放弃。"
  ],
  "baselineAuthoring.discardDraft": [
    "Discard draft",
    "放弃草稿"
  ],
  "baselineAuthoring.baselineName": [
    "Baseline name",
    "基线名称"
  ],
  "baselineAuthoring.newBaselineName": [
    "New baseline name",
    "新基线名称"
  ],
  "baselineAuthoring.baselineScope": [
    "Baseline scope",
    "基线范围"
  ],
  "baselineAuthoring.theServerFixesTheScopeFromYourRoleThe": [
    "The server fixes the scope from your role; the baseline cannot be changed to the other scope later.",
    "服务器根据您的角色固定范围；基线之后无法再改为另一种范围。"
  ],
  "baselineAuthoring.completeRecipeEachLayerAndThePerovskiteDepositionProcess": [
    "Complete recipe: each layer and the Perovskite deposition process snapshot are complete.",
    "配方完整：每层与钙钛矿沉积工艺快照均已完整。"
  ],
  "baselineAuthoring.nReviewItemsRemainBeforeThisBaselineCanBe": [
    "{n} review items remain before this baseline can be saved.",
    "该基线保存前还剩 {n} 项待检查。"
  ],
  "baselineAuthoring.saveNewRevision": [
    "Save new revision",
    "保存新修订版"
  ],
  "baselineAuthoring.saveSharedBaseline": [
    "Save shared baseline",
    "保存共享基线"
  ],
  "baselineAuthoring.savePersonalBaseline": [
    "Save personal baseline",
    "保存个人基线"
  ],
  "baselineAuthoring.completeTheseValuesBeforeSaving": [
    "Complete these values before saving",
    "保存前请完成以下内容"
  ],
  "campaignAnalysisPanel.campaignComparisonNeedsAnExperimentInACampaignNone": [
    "Campaign comparison needs an experiment in a campaign — none is visible yet.",
    "实验系列对比需要实验系列内的实验——目前尚无可见实验。"
  ],
  "campaignAnalysisPanel.readOnlyComparisonAcrossTheCampaignDirectionalDeviceStatistics": [
    "Read-only comparison across the campaign: directional device statistics, recorded actual process variants against the frozen plan, and same-batch control/target differences.",
    "当前实验系列内的只读对比：分方向器件统计、相对已固定的计划的实际工艺变体，以及同批次对照/目标差异。"
  ],
  "campaignAnalysisPanel.campaignComparison": [
    "Campaign comparison",
    "实验系列对比"
  ],
  "campaignAnalysisPanel.campaign": [
    "Campaign",
    "实验系列"
  ],
  "campaignAnalysisPanel.batch": [
    "Batch",
    "批次"
  ],
  "campaignAnalysisPanel.allBatches": [
    "All batches",
    "全部批次"
  ],
  "campaignAnalysisPanel.latestUpload": [
    "latest upload",
    "最新上传"
  ],
  "campaignAnalysisPanel.meanAcrossUploads": [
    "mean across uploads",
    "各上传均值"
  ],
  "campaignAnalysisPanel.loadingCampaignAnalysis": [
    "Loading campaign analysis…",
    "正在加载实验系列分析…"
  ],
  "campaignAnalysisPanel.unableToLoadTheCampaignAnalysis": [
    "Unable to load the campaign analysis: ",
    "无法加载实验系列分析： "
  ],
  "campaignAnalysisPanel.experimentSInScopeRules": [
    " experiment(s) in scope · rules ",
    " 个范围内实验 · 规则 "
  ],
  "campaignAnalysisPanel.representative": [
    " · representative ",
    " · 代表值 "
  ],
  "campaignAnalysisPanel.digest": [
    " · digest ",
    " · 摘要 "
  ],
  "campaignAnalysisPanel.forwardAndReverseScansAreReportedSeparatelyDeviceStatistics": [
    "Forward and reverse scans are reported separately. Device statistics are descriptive; the substrate mean is the equally weighted per-substrate view.",
    "正向与反向扫描分开报告。器件统计为描述性统计；基底均值是等权重的逐基底视图。"
  ],
  "campaignAnalysisPanel.directionalSummaries": [
    "Directional summaries",
    "分方向汇总"
  ],
  "campaignAnalysisPanel.noMeasuredDevicesAreVisibleInThisScopeYet": [
    "No measured devices are visible in this scope yet.",
    "该范围内尚无可见的已测量器件。"
  ],
  "campaignAnalysisPanel.campaignSummaryTable": [
    "Campaign summary table",
    "实验系列汇总表"
  ],
  "campaignAnalysisPanel.directionalSummariesPerConditionVariantForwardAndReverseSeparate": [
    "Directional summaries per condition variant, forward and reverse separate",
    "按条件变体的分方向汇总，正反向分开"
  ],
  "campaignAnalysisPanel.condition": [
    "Condition",
    "条件"
  ],
  "campaignAnalysisPanel.variant": [
    "Variant",
    "变体"
  ],
  "campaignAnalysisPanel.measurements": [
    "Measurements",
    "测量"
  ],
  "campaignAnalysisPanel.pceMedian": [
    "PCE median",
    "PCE 中位数"
  ],
  "campaignAnalysisPanel.pceBest": [
    "PCE best",
    "PCE 最佳"
  ],
  "campaignAnalysisPanel.substrateMeanPCE": [
    "Substrate-mean PCE",
    "基底均值 PCE"
  ],
  "campaignAnalysisPanel.valueNSubstrateUnits": [
    "{value} ({n} substrate units)",
    "{value}（{n} 个基底单元）"
  ],
  "campaignAnalysisPanel.eachVariantShowsTheEffectiveValueBehindTheStatistics": [
    "Each variant shows the effective value behind the statistics (the recorded actual value, the frozen-plan fallback marked 'planned', or '—' for a step the execution never performed) beside the frozen plan's reference value. '◆ deviates from plan' marks rows where the effective value differs from the plan.",
    "每个变体在已固定的计划参考值旁显示统计背后的有效值（记录的实际值、标记为\"计划\"的已固定的计划回退值，或执行中从未进行的步骤显示\"—\"）。\"◆ 偏离计划\"标记有效值与计划不同的行。"
  ],
  "campaignAnalysisPanel.actualProcessVsFrozenPlan": [
    "Actual process vs frozen plan",
    "实际工艺 vs 已固定的计划"
  ],
  "campaignAnalysisPanel.noFabricationBatchesExistForThisScopeYet": [
    "No fabrication batches exist for this scope yet.",
    "该范围内尚无制备批次。"
  ],
  "campaignAnalysisPanel.actualProcessComparisonTable": [
    "Actual process comparison table",
    "实际工艺对比表"
  ],
  "campaignAnalysisPanel.recordedActualProcessParametersBesideTheFrozenPlanReference": [
    "Recorded actual process parameters beside the frozen plan reference per condition variant",
    "按条件变体，记录的实际工艺参数与已固定的计划参考值并列"
  ],
  "campaignAnalysisPanel.variant2": [
    "Variant ",
    "变体 "
  ],
  "campaignAnalysisPanel.actualEffective": [
    "Actual / effective",
    "实际 / 有效"
  ],
  "campaignAnalysisPanel.plannedFrozen": [
    "Planned (frozen)",
    "计划（已固定）"
  ],
  "campaignAnalysisPanel.differs": [
    "◆ differs",
    "◆ 有差异"
  ],
  "campaignAnalysisPanel.deviatesFromPlan": [
    "◆ deviates from plan",
    "◆ 偏离计划"
  ],
  "campaignAnalysisPanel.descriptiveDifferenceOfEquallyWeightedSubstrateMeansWithinOne": [
    "Descriptive difference of equally weighted substrate means within one batch. No significance test is applied; percent change is undefined when the control mean is zero.",
    "同一批次内等权重基底均值的描述性差异。不做显著性检验；对照均值为零时百分比变化无定义。"
  ],
  "campaignAnalysisPanel.sameBatchControlVsTarget": [
    "Same-batch control vs target",
    "同批次对照 vs 目标"
  ],
  "campaignAnalysisPanel.controlTargetComparisonTable": [
    "Control target comparison table",
    "对照目标对比表"
  ],
  "campaignAnalysisPanel.descriptiveControlVersusTargetComparisonsPerBatchDirectionAnd": [
    "Descriptive control versus target comparisons per batch, direction, and metric",
    "按批次、方向和指标的描述性对照与目标对比"
  ],
  "campaignAnalysisPanel.control": [
    "Control",
    "对照"
  ],
  "campaignAnalysisPanel.target": [
    "Target",
    "目标"
  ],
  "campaignAnalysisPanel.metric": [
    "Metric",
    "指标"
  ],
  "campaignAnalysisPanel.controlMean": [
    "Control mean",
    "对照均值"
  ],
  "campaignAnalysisPanel.targetMean": [
    "Target mean",
    "目标均值"
  ],
  "campaignAnalysisPanel.difference": [
    "Difference",
    "差值"
  ],
  "campaignAnalysisPanel.change": [
    "Change",
    "变化"
  ],
  "campaignAnalysisPanel.unitsControlTarget": [
    "Units (control/target)",
    "单位（对照/目标）"
  ],
  "campaignAnalysisPanel.controlMeanIsZero": [
    "— (control mean is zero)",
    "—（对照均值为零）"
  ],
  "campaignAnalysisPanel.measurementCoverage": [
    "Measurement coverage",
    "测量覆盖"
  ],
  "campaignAnalysisPanel.everyExcludedOrUnresolvableRecordIsListedHereNothing": [
    "Every excluded or unresolvable record is listed here; nothing is silently dropped from the payload.",
    "每条被排除或无法解析的记录都列在此处；不会从数据中静默丢弃任何内容。"
  ],
  "campaignAnalysisPanel.dataQuality": [
    "Data quality",
    "数据质量"
  ],
  "campaignAnalysisPanel.noExclusionsUnboundDevicesMissingDirectionsOrLegacyRecords": [
    "No exclusions, unbound devices, missing directions, or legacy records in this scope.",
    "该范围内没有排除、未绑定器件、缺失方向或遗留记录。"
  ],
  "campaignAnalysisPanel.result": [
    "Result ",
    "结果 "
  ],
  "campaignAnalysisPanel.sourceResult": [
    "Source result ",
    "源结果 "
  ],
  "conditionPlanner.eachTargetRetainsACompleteEditableLayerStackAnd": [
    "Each target retains a complete editable layer stack and perovskite process, independent of the control.",
    "每个目标保留完整可编辑的层堆叠与钙钛矿工艺，独立于对照。"
  ],
  "conditionPlanner.layer": [
    "Layer ",
    "层 "
  ],
  "conditionPlanner.layerName": [
    "Layer name",
    "层名称"
  ],
  "conditionPlanner.step": [
    "Step 4",
    "步骤 4"
  ],
  "conditionPlanner.experimentConditions": [
    "Experiment conditions",
    "实验条件"
  ],
  "conditionPlanner.addTarget": [
    "Add target",
    "添加目标"
  ],
  "conditionPlanner.planType": [
    "Plan type",
    "计划类型"
  ],
  "conditionPlanner.comparative": [
    " Comparative",
    " 对比"
  ],
  "conditionPlanner.standalone": [
    " Standalone",
    " 独立"
  ],
  "conditionPlanner.targetConditionsBeginAsDeepCopiesEachTargetRetains": [
    "Target conditions begin as deep copies. Each target retains its own complete editable stack and process snapshot.",
    "新增目标条件会复制对照方案，并保留完整的层堆叠与工艺快照，之后可独立修改。"
  ],
  "conditionPlanner.removeTarget": [
    "Remove target",
    "移除目标"
  ],
  "conditionPlanner.conditionName": [
    "Condition name",
    "条件名称"
  ],
  "conditionPlanner.deviceLayout": [
    "Device layout",
    "器件布局"
  ],
  "conditionPlanner.chooseAMatchingLayout": [
    "Choose a matching layout…",
    "请选择匹配的布局…"
  ],
  "conditionPlanner.plannedSubstrates": [
    "Planned substrates",
    "计划基底数"
  ],
  "conditionPlanner.expectedDevices": [
    "Expected devices: ",
    "预期器件数： "
  ],
  "conditionPlanner.editCompleteIndependentTargetSnapshot": [
    "Edit complete independent target snapshot",
    "编辑完整独立目标快照"
  ],
  "conditionPlanner.changePlanType": [
    "Change plan type",
    "更改计划类型"
  ],
  "conditionPlanner.discardEditsAndSwitch": [
    "Discard edits and switch",
    "放弃修改并切换"
  ],
  "layerStackEditor.step": [
    "Step 3",
    "步骤 3"
  ],
  "layerStackEditor.functionalLayerStack": [
    "Functional layer stack",
    "功能层堆叠"
  ],
  "layerStackEditor.layers": [
    " layers",
    " 层"
  ],
  "layerStackEditor.addingOrReplacingAPresetCopiesItsCompleteValues": [
    "Adding or replacing a preset copies its complete values into this draft. Later preset revisions cannot alter the saved experiment.",
    "添加或替换预设会将其完整值复制到本草稿。之后的预设修订不会改变已保存的实验。"
  ],
  "layerStackEditor.deviceArchitecture": [
    "Device architecture",
    "器件结构"
  ],
  "layerStackEditor.pINInvertedHTLOnSubstrate": [
    "p-i-n (inverted: HTL on substrate)",
    "p-i-n（反式：HTL 在基底上）"
  ],
  "layerStackEditor.nIPRegularETLOnSubstrate": [
    "n-i-p (regular: ETL on substrate)",
    "n-i-p（正式：ETL 在基底上）"
  ],
  "layerStackEditor.setsTheDepositionRoleOrderSwitchingReSortsThe": [
    "Sets the deposition role order. Switching re-sorts the stack; within-role material order is preserved.",
    "设定沉积角色顺序。切换会重新排序堆叠；同角色内的材料顺序保持不变。"
  ],
  "layerStackEditor.layerPreset": [
    "Layer preset",
    "层预设"
  ],
  "layerStackEditor.chooseAnActivePreset": [
    "Choose an active preset…",
    "请选择一个可用预设…"
  ],
  "layerStackEditor.addCopiedPreset": [
    "Add copied preset",
    "添加复制的预设"
  ],
  "layerStackEditor.newBlankLayer": [
    "New blank layer",
    "新建空白层"
  ],
  "layerStackEditor.chooseALayerType": [
    "Choose a layer type…",
    "请选择层类型…"
  ],
  "layerStackEditor.addBlankLayer": [
    "Add blank layer",
    "添加空白层"
  ],
  "layerStackEditor.aBlankLayerStartsWithNoSolutionAndNo": [
    "A blank layer starts with no solution and no process — add them via “Edit complete layer values”. Presets are a shortcut, not a requirement.",
    "空白层初始没有溶液和工艺——请通过\"编辑完整层值\"添加。预设是捷径，不是必需。"
  ],
  "layerStackEditor.layersOfTheSameMaterialTypeCanBeResequenced": [
    "Layers of the same material type can be resequenced by dragging the handle; different materials retain the required device order.",
    "同材料类型的层可拖动手柄重新排序；不同材料保持器件所需顺序。"
  ],
  "layerStackEditor.noLayersYetAddCopiedPresetsOrBlankLayers": [
    "No layers yet. Add copied presets or blank layers; they are placed in the required device order.",
    "暂无层。添加复制的预设或空白层；它们会按器件所需顺序放置。"
  ],
  "layerStackEditor.dragToReorder": [
    "Drag to reorder",
    "拖动以重新排序"
  ],
  "layerStackEditor.copiedFromSource": [
    " · copied from {source}",
    "· 复制自 {source}"
  ],
  "layerStackEditor.perovskiteProcessIncompleteOpenEditCompleteLayerValuesAnd": [
    "Perovskite process incomplete — open “Edit complete layer values” and fill in every vacuum stage.",
    "钙钛矿工艺不完整——请打开\"编辑完整层值\"并填写每个真空阶段。"
  ],
  "layerStackEditor.layerValuesIncompleteOpenEditCompleteLayerValuesAnd": [
    "Layer values incomplete — open “Edit complete layer values” and fill in the missing process or solution values.",
    "层值不完整——请打开\"编辑完整层值\"并填写缺失的工艺或溶液值。"
  ],
  "layerStackEditor.editCompleteLayerValues": [
    "Edit complete layer values",
    "编辑完整层值"
  ],
  "layerStackEditor.replaceFromSameTypePreset": [
    "Replace from same-type preset",
    "从同类型预设替换"
  ],
  "layerStackEditor.keepCurrentExpandedValues": [
    "Keep current expanded values",
    "保留当前展开值"
  ],
  "layerStackEditor.revision": [
    " · revision ",
    " · 修订版 "
  ],
  "processEditor.required": [
    "required",
    "必填"
  ],
  "processEditor.optional": [
    "optional",
    "可选"
  ],
  "processEditor.spinStages": [
    "Spin stages ",
    "旋涂阶段 "
  ],
  "processEditor.addSpinStage": [
    "Add spin stage",
    "添加旋涂阶段"
  ],
  "processEditor.stageNSpeedRpm": [
    "Stage {n} speed (rpm)",
    "阶段 {n} 转速 (rpm)"
  ],
  "processEditor.durationS": [
    "Duration (s)",
    "时长 (s)"
  ],
  "processEditor.accelerationRpmS": [
    "Acceleration (rpm/s)",
    "加速度 (rpm/s)"
  ],
  "processEditor.annealingStages": [
    "Annealing stages ",
    "退火阶段 "
  ],
  "processEditor.addAnnealingStage": [
    "Add annealing stage",
    "添加退火阶段"
  ],
  "processEditor.stageNTemperatureC": [
    "Stage {n} temperature (°C)",
    "阶段 {n} 温度 (°C)"
  ],
  "processEditor.noLayerProcessIsRecorded": [
    "No layer process is recorded.",
    "未记录层工艺。"
  ],
  "processEditor.addProcess": [
    "Add process",
    "添加工艺"
  ],
  "processEditor.layerProcess": [
    "Layer process",
    "层工艺"
  ],
  "processEditor.removeProcess": [
    "Remove process",
    "移除工艺"
  ],
  "processEditor.thisLayerProcessIsNotCompleteYet": [
    "This layer process is not complete yet.",
    "该层工艺尚不完整。"
  ],
  "processEditor.fillInTheMissingValuesBelowTheSaveButton": [
    "Fill in the missing values below — the save button unlocks once every stage is complete.",
    "请填写下方缺失值，所有阶段完整后即可保存。"
  ],
  "processEditor.method": [
    "Method",
    "方法"
  ],
  "processEditor.sputterMode": [
    "Sputter mode",
    "溅射模式"
  ],
  "processEditor.pulsedDC": [
    "Pulsed DC",
    "脉冲 DC"
  ],
  "processEditor.powerW": [
    "Power (W)",
    "功率 (W)"
  ],
  "processEditor.pressurePa": [
    "Pressure (Pa)",
    "压强 (Pa)"
  ],
  "processEditor.gas": [
    "Gas 1",
    "气体 1"
  ],
  "processEditor.gasFlowSccm": [
    "Gas 1 flow (sccm)",
    "气体 1 流量 (sccm)"
  ],
  "processEditor.gasOptional": [
    "Gas 2 (optional)",
    "气体 2（可选）"
  ],
  "processEditor.gasFlowSccm2": [
    "Gas 2 flow (sccm)",
    "气体 2 流量 (sccm)"
  ],
  "processEditor.thicknessNm": [
    "Thickness (nm)",
    "厚度 (nm)"
  ],
  "processEditor.rateS": [
    "Rate (Å/s)",
    "速率 (Å/s)"
  ],
  "processEditor.substrateTemperatureC": [
    "Substrate temperature (°C)",
    "基底温度 (°C)"
  ],
  "processEditor.cycles": [
    "Cycles",
    "循环数"
  ],
  "processEditor.perovskiteDepositionProcess": [
    "Perovskite deposition process",
    "钙钛矿沉积工艺"
  ],
  "processEditor.theOrderedSpinVacuumGasBackfillAndAnnealingStages": [
    "The ordered spin, vacuum/gas-backfill, and annealing stages are stored as a complete snapshot.",
    "有序的旋涂、真空/气体回填与退火阶段将作为完整快照保存。"
  ],
  "processEditor.thisPerovskiteProcessIsNotCompleteYet": [
    "This perovskite process is not complete yet.",
    "该钙钛矿工艺尚不完整。"
  ],
  "processEditor.fillInTheHighlightedStagesBelowTheSaveButton": [
    "Fill in the highlighted stages below — the save button unlocks once every stage is complete.",
    "请填写下方高亮阶段，所有阶段完整后即可保存。"
  ],
  "processEditor.vacuumAndGasBackfillProgram": [
    "Vacuum and gas-backfill program ",
    "真空与气体回填程序 "
  ],
  "processEditor.vcdProgram": [
    "VCD program",
    "VCD 程序"
  ],
  "processEditor.howToRecordTheVCDProgram": [
    "How to record the VCD program",
    "如何记录 VCD 程序"
  ],
  "processEditor.rowsRunInOrderUpToFiveEvacuateRows": [
    "Rows run in order. Up to five evacuate rows and five gas-backfill rows.",
    "各行按顺序执行。最多五行抽真空和五行气体回填。"
  ],
  "processEditor.valvePressureIntegerPaAndHoldTimeWholeSeconds": [
    " — valve, pressure (integer Pa), and hold time (whole seconds; 0 s = reach the pressure and move on without holding).",
    " — 阀门、压强（整数 Pa）和保持时间（整数 s；0 s 表示达到压强后继续下一步，不保持）。"
  ],
  "processEditor.pumpToBaseVacuum": [
    "Pump to base vacuum",
    "抽至本底真空"
  ],
  "processEditor.pressureNotControlledSetThePressureToAndRecord": [
    " (pressure not controlled) — set the pressure to 0 and record the total pump time.",
    " （不控制压强）— 压强填 0，记录总抽气时间。"
  ],
  "processEditor.multiPressureHolding": [
    "Multi-pressure holding",
    "多压强保持"
  ],
  "processEditor.addOneRowPerSetpointTheValveMayChange": [
    " — add one row per setpoint; the valve may change between rows (for example VV03 pumps fast and can overshoot a setpoint, so VV03 to reach it then VV06 to hold it).",
    " — 每个设定点填写一行，不同行可使用不同阀门（例如 VV03 抽气快，可能超调，可先用 VV03 达到目标，再用 VV06 保持）。"
  ],
  "processEditor.gasMFCFlowIntegerSccmTargetPressurePaAnd": [
    " — gas, MFC flow (integer sccm), target pressure (Pa), and hold time (s; 0 = no hold). The fill time itself is not recorded.",
    " — 气体、MFC 流量（整数 sccm）、目标压强 (Pa) 和保持时间（s；0 表示不保持）。不记录充气过程本身的时间。"
  ],
  "processEditor.addStage": [
    "Add stage",
    "添加阶段"
  ],
  "processEditor.atLeastOneEvacuationRowIsRequiredGasBackfill": [
    "At least one evacuation row is required. Gas-backfill rows are optional — add them only if your program includes a gas backfill.",
    "至少需要一行抽真空。气体回填行可选——仅当程序包含气体回填时添加。"
  ],
  "processEditor.stage": [
    "Stage ",
    "阶段 "
  ],
  "processEditor.valve": [
    "Valve",
    "阀门"
  ],
  "processEditor.gas2": [
    "Gas",
    "气体"
  ],
  "processEditor.flowSccm": [
    "Flow (sccm)",
    "流量 (sccm)"
  ],
  "processEditor.targetPressurePa": [
    "Target pressure (Pa)",
    "目标压强 (Pa)"
  ],
  "processEditor.holdTimeS": [
    "Hold time (s)",
    "保持时间 (s)"
  ],
  "reviewPanel.step": [
    "Step 5",
    "步骤 5"
  ],
  "reviewPanel.reviewCompletePlan": [
    "Review complete plan",
    "检查完整计划"
  ],
  "reviewPanel.readyToSave": [
    "Ready to save",
    "可以保存"
  ],
  "reviewPanel.nItemsNeedAttention": [
    "{n} items need attention",
    "{n} 项待处理"
  ],
  "reviewPanel.provenance": [
    "Provenance",
    "溯源"
  ],
  "reviewPanel.notSelected": [
    "Not selected",
    "未选择"
  ],
  "reviewPanel.startingPoint": [
    "Starting point",
    "起点"
  ],
  "reviewPanel.nameRevisionN": [
    "{name} · revision {n}",
    "{name} · 修订版 {n}"
  ],
  "reviewPanel.blankPlan": [
    "Blank plan",
    "空白计划"
  ],
  "reviewPanel.baselineVersion": [
    "Baseline version",
    "基线版本"
  ],
  "reviewPanel.none": [
    "None",
    "无"
  ],
  "reviewPanel.setupMode": [
    "Setup mode",
    "设置方式"
  ],
  "reviewPanel.noSupplier": [
    "No supplier",
    "无供应商"
  ],
  "reviewPanel.noCatalogNumber": [
    "No catalog number",
    "无货号"
  ],
  "reviewPanel.orderedFunctionalLayers": [
    "Ordered functional layers",
    "有序功能层"
  ],
  "reviewPanel.spinCoatingVCD": [
    "spin coating + VCD",
    "旋涂 + VCD"
  ],
  "reviewPanel.noProcess": [
    "no process",
    "无工艺"
  ],
  "reviewPanel.spinStages": [
    "Spin stages",
    "旋涂阶段"
  ],
  "reviewPanel.vcdStages": [
    "VCD stages",
    "VCD 阶段"
  ],
  "reviewPanel.gasBackfills": [
    "Gas backfills",
    "气体回填"
  ],
  "reviewPanel.annealingStages": [
    "Annealing stages",
    "退火阶段"
  ],
  "reviewPanel.vcdSequence": [
    "VCD sequence",
    "VCD 顺序"
  ],
  "reviewPanel.conditionPlan": [
    "Condition plan",
    "条件计划"
  ],
  "reviewPanel.role": [
    "Role",
    "角色"
  ],
  "reviewPanel.expectedDevices": [
    "Expected devices",
    "预期器件"
  ],
  "reviewPanel.snapshot": [
    "Snapshot",
    "快照"
  ],
  "reviewPanel.completeIndependentCopy": [
    "Complete independent copy",
    "完整独立副本"
  ],
  "reviewPanel.primaryRecipe": [
    "Primary recipe",
    "主配方"
  ],
  "solutionEditor.noSolutionFormulationIsRecordedForThisLayer": [
    "No solution formulation is recorded for this layer.",
    "该层未记录溶液配方。"
  ],
  "solutionEditor.addSolutionFormulation": [
    "Add solution formulation",
    "添加溶液配方"
  ],
  "solutionEditor.solutionFormulation": [
    "Solution formulation",
    "溶液配方"
  ],
  "solutionEditor.removeFormulation": [
    "Remove formulation",
    "移除配方"
  ],
  "solutionEditor.formulationType": [
    "Formulation type",
    "配方类型"
  ],
  "solutionEditor.stockDispersion": [
    "Stock dispersion",
    "原液"
  ],
  "solutionEditor.stockVolumeML": [
    "Stock volume (mL)",
    "原液体积 (mL)"
  ],
  "solutionEditor.solidIngredients": [
    "Solid ingredients",
    "固体成分"
  ],
  "solutionEditor.addSolid": [
    "Add solid",
    "添加固体"
  ],
  "solutionEditor.chemical": [
    "Chemical ",
    "化学品 "
  ],
  "solutionEditor.weightMg": [
    "Weight (mg)",
    "质量 (mg)"
  ],
  "solutionEditor.removeSolidN": [
    "Remove solid {n}",
    "移除固体 {n}"
  ],
  "solutionEditor.solvents": [
    "Solvents",
    "溶剂"
  ],
  "solutionEditor.addSolvent": [
    "Add solvent",
    "添加溶剂"
  ],
  "solutionEditor.solvent": [
    "Solvent ",
    "溶剂 "
  ],
  "solutionEditor.volumeML": [
    "Volume (mL)",
    "体积 (mL)"
  ],
  "solutionEditor.removeSolventN": [
    "Remove solvent {n}",
    "移除溶剂 {n}"
  ],
  "startingPointPanel.step": [
    "Step 1",
    "步骤 1"
  ],
  "startingPointPanel.expandedSnapshot": [
    "Expanded snapshot",
    "展开快照"
  ],
  "startingPointPanel.threeWaysToBeginExpandABaselineTheShortcut": [
    "Three ways to begin: expand a baseline (the shortcut — its complete recipe is copied into this editable plan), or plan from scratch and fill in every layer, material, and process yourself. Either way the experiment stores its own complete snapshot; a baseline reference is provenance only.",
    "三种开始方式：展开基线（捷径——其完整配方将复制到本可编辑计划中），或从零规划，自行填写每层、每种材料和工艺。无论哪种方式，实验都会保存自己的完整快照；基线引用仅作溯源。"
  ],
  "startingPointPanel.chooseAnActiveCampaign": [
    "Choose an active Campaign…",
    "请选择一个进行中的实验系列…"
  ],
  "startingPointPanel.baselineReferenceOptionalShortcut": [
    "Baseline reference (optional shortcut)",
    "基线引用（可选捷径）"
  ],
  "startingPointPanel.changingThisSelectionReplacesTheCurrentEditableRecipeWith": [
    "Changing this selection replaces the current editable recipe with a fresh deep copy. Leave empty to plan from scratch.",
    "更改此选项会用所选基线的独立副本替换当前可编辑配方。留空则从零规划。"
  ],
  "startingPointPanel.noBaselinesAvailableYetPlanFromScratchBelow": [
    "No baselines available yet — plan from scratch below",
    "暂无可用基线——请在下方从零规划"
  ],
  "startingPointPanel.chooseAnActiveBaseline": [
    "Choose an active baseline…",
    "请选择一个可用基线…"
  ],
  "startingPointPanel.blankPlanActive": [
    "Blank plan active",
    "空白计划已激活"
  ],
  "substratePanel.step": [
    "Step 2",
    "步骤 2"
  ],
  "substratePanel.substrateAndDeviceLayout": [
    "Substrate and device layout",
    "基底与器件布局"
  ],
  "substratePanel.supplierProductsComeFromTheReusableMaterialDirectoryA": [
    "Supplier products come from the reusable material directory. A layout controls substrate dimensions and expected device counts.",
    "供应商产品来自可复用材料目录。布局决定基底尺寸与预期器件数。"
  ],
  "substratePanel.substrateMaterial": [
    "Substrate material",
    "基底材料"
  ],
  "substratePanel.chooseAMaterial": [
    "Choose a material…",
    "请选择材料…"
  ],
  "substratePanel.pendingReview": [
    " (pending review)",
    " （待审核）"
  ],
  "substratePanel.supplierProduct": [
    "Supplier product",
    "供应商产品"
  ],
  "substratePanel.chooseASupplierProduct": [
    "Choose a supplier product…",
    "请选择供应商产品…"
  ],
  "substratePanel.chooseALayout": [
    "Choose a layout…",
    "请选择布局…"
  ],
  "substratePanel.footprint": [
    "Footprint",
    "外形尺寸"
  ],
  "substratePanel.devicesPerSubstrate": [
    "Devices per substrate",
    "每基底器件数"
  ],
  "substratePanel.catalogSource": [
    "Catalog source",
    "目录来源"
  ],
  "blankPresetForm.layerType": [
    "Layer type",
    "层类型"
  ],
  "blankPresetForm.presetName": [
    "Preset name",
    "预设名称"
  ],
  "blankPresetForm.role": [
    "Role ",
    "角色 "
  ],
  "blankPresetForm.derivedFromTheLayerTypeAndFixedForThis": [
    " — derived from the layer type and fixed for this preset.",
    " — 由层类型确定，当前预设不可修改。"
  ],
  "blankPresetForm.presetScope": [
    "Preset scope",
    "预设范围"
  ],
  "blankPresetForm.sharedDirectory": [
    "Shared directory",
    "共享目录"
  ],
  "blankPresetForm.personal": [
    "Personal",
    "个人"
  ],
  "blankPresetForm.creating": [
    "Creating…",
    "创建中…"
  ],
  "blankPresetForm.createSharedPreset": [
    "Create shared preset",
    "创建共享预设"
  ],
  "blankPresetForm.createPersonalPreset": [
    "Create personal preset",
    "创建个人预设"
  ],
  "blankPresetForm.cancelDiscardsTheEnteredValuesWithoutSendingAnyRequest": [
    "Cancel discards the entered values without sending any request.",
    "取消将丢弃所填内容，不发送任何请求。"
  ],
  "createFromSnapshotForm.copiesTheSelectedPresetSCompleteValuesIntoA": [
    "Copies the selected preset's complete values into a ",
    "将所选预设的完整参数复制为一个 "
  ],
  "createFromSnapshotForm.newIndependentPreset": [
    "new independent preset",
    "新的独立预设"
  ],
  "createFromSnapshotForm.withItsOwnHistoryTheSourcePresetIsUnchanged": [
    " with its own history — the source preset is unchanged. To record the next version of the same preset instead, use ",
    " ，保留独立历史，原预设不变。若要记录同一预设的下一版本，请使用 "
  ],
  "createFromSnapshotForm.editPreset": [
    "Edit preset",
    "编辑预设"
  ],
  "createFromSnapshotForm.andSaveANewRevision": [
    " and save a new revision.",
    " 并保存新修订版。"
  ],
  "createFromSnapshotForm.newPresetName": [
    "New preset name",
    "新预设名称"
  ],
  "createFromSnapshotForm.sourcePreset": [
    "Source preset",
    "源预设"
  ],
  "createFromSnapshotForm.unavailableSourcePreset": [
    "Unavailable source preset",
    "源预设不可用"
  ],
  "createFromSnapshotForm.theSelectedSourcePresetIsNoLongerAvailableIt": [
    "The selected source preset is no longer available (it may have been deactivated). Choose another source preset to continue.",
    "所选源预设不再可用（可能已被停用）。请选择其他源预设以继续。"
  ],
  "presetBrowseCard.incompleteTemplateMissing": [
    "Incomplete template — missing: ",
    "模板不完整，缺少： "
  ],
  "presetBrowseCard.openTheDetailsToCompleteTheDepositionProcess": [
    ". Open the details to complete the deposition process.",
    "。请打开详情补全沉积工艺。"
  ],
  "presetBrowseCard.partialTemplateMissing": [
    "Partial template — missing: ",
    "模板待补充，缺少： "
  ],
  "presetBrowseCard.completeTheseValuesPerExperimentOrFinishTheTemplate": [
    ". Complete these values per experiment, or finish the template.",
    "。可在各实验中填写这些参数，或补全模板。"
  ],
  "presetBrowseCard.updated": [
    " · updated ",
    " · 更新于 "
  ],
  "presetBrowseCard.viewDetails": [
    "View details",
    "查看详情"
  ],
  "presetBrowseCard.edit": [
    "Edit",
    "编辑"
  ],
  "presetBrowseCard.promoteToShared": [
    "Promote to shared",
    "提升为共享"
  ],
  "presetDetailView.backToLibrary": [
    "← Back to library",
    "← 返回库"
  ],
  "presetDetailView.spinCoatingVCD": [
    "Spin coating + VCD",
    "旋涂 + VCD"
  ],
  "presetDetailView.deactivate": [
    "Deactivate ",
    "停用 "
  ],
  "presetDetailView.partialTemplateThisPresetIsLegalToKeepAnd": [
    "Partial template — this preset is legal to keep and revise, but it is not a complete experiment layer yet. Missing values are listed per section below.",
    "部分模板——该预设可以保留和修订，但尚不是完整的实验层。缺失值在下方分节列出。"
  ],
  "presetDetailView.templateComplete": [
    "Template complete",
    "模板完整"
  ],
  "presetDetailView.experimentReady": [
    "Experiment-ready",
    "可用于实验"
  ],
  "presetDetailView.layerAndFormulation": [
    "Layer and formulation",
    "层与配方"
  ],
  "presetDetailView.revision": [
    "Revision",
    "修订版"
  ],
  "presetDetailView.scope": [
    "Scope",
    "范围"
  ],
  "presetDetailView.processInExecutionOrder": [
    "Process in execution order",
    "按执行顺序的工艺"
  ],
  "presetDetailView.thePerovskiteProgramRunsSpinCoatingThenTheVacuum": [
    "The perovskite program runs spin coating, then the vacuum/gas-backfill rows in their recorded order, then annealing.",
    "钙钛矿程序依次执行旋涂、按记录顺序的真空/气体回填行，然后退火。"
  ],
  "presetDetailView.recordedProcessValuesForThisLayerType": [
    "Recorded process values for this layer type.",
    "该层类型已记录的工艺值。"
  ],
  "presetDetailView.spinCoating": [
    "Spin coating",
    "旋涂"
  ],
  "presetDetailView.stageN": [
    "Stage {n}",
    "阶段 {n}"
  ],
  "presetDetailView.vacuumAndGasBackfillProgram": [
    "Vacuum and gas-backfill program",
    "真空与气体回填程序"
  ],
  "presetDetailView.evacuateStageN": [
    "Evacuate (stage {n})",
    "抽真空（阶段 {n}）"
  ],
  "presetDetailView.gasBackfillStageN": [
    "Gas backfill (stage {n})",
    "气体回填（阶段 {n}）"
  ],
  "presetDetailView.gasFSccmPPaHoldSS": [
    "{gas} · {f} sccm → {p} Pa · hold {s} s",
    "{gas} · {f} sccm → {p} Pa · 保持 {s} s"
  ],
  "presetDetailView.annealing": [
    "Annealing",
    "退火"
  ],
  "presetDetailView.noProcessRecordedForThisPreset": [
    "No process recorded for this preset.",
    "该预设未记录工艺。"
  ],
  "presetDetailView.versionHistoryAndComparison": [
    "Version history and comparison",
    "版本历史与对比"
  ],
  "presetDetailView.versionHistoryAndComparisonBecomeAvailableAfterThePreset": [
    "Version history and comparison become available after the preset is promoted to shared.",
    "预设提升为共享后，版本历史与对比才可用。"
  ],
  "presetDetailView.technicalProvenance": [
    "Technical provenance",
    "技术溯源"
  ],
  "presetDetailView.canonicalHashSourceKeyAndSchema": [
    "Canonical hash, source key, and schema",
    "规范哈希、源键与数据结构"
  ],
  "presetDetailView.canonicalHash": [
    "Canonical hash",
    "规范哈希"
  ],
  "presetDetailView.presetKey": [
    "Preset key",
    "预设键"
  ],
  "presetDetailView.created": [
    "Created",
    "创建时间"
  ],
  "presetDetailView.updated": [
    "Updated",
    "更新时间"
  ],
  "presetDetailView.promoteLayerPresetToShared": [
    "Promote layer preset to shared",
    "将层预设提升为共享"
  ],
  "presetDetailView.everyStudentWillBeAbleToSelectNameAs": [
    "Every student will be able to select {name} as a starting point. Promotion is one-way: the preset cannot be made personal again.",
    "所有学生都将能把 {name} 作为起点。提升是单向的：预设无法再变回个人。"
  ],
  "presetDetailView.deactivateLayerPreset": [
    "Deactivate layer preset",
    "停用层预设"
  ],
  "presetDetailView.existingExperimentSnapshotsRemainUnchangedThisPresetWillNo": [
    "Existing experiment snapshots remain unchanged. This preset will no longer be available for new selections.",
    "已有实验快照保持不变。该预设将不再供新选择使用。"
  ],
  "presetDetailView.deactivatePreset": [
    "Deactivate preset",
    "停用预设"
  ],
  "presetDiffViewer.identity": [
    "Identity",
    "标识"
  ],
  "presetDiffViewer.added": [
    "added",
    "新增"
  ],
  "presetDiffViewer.removed": [
    "removed",
    "删除"
  ],
  "presetDiffViewer.changed": [
    "changed",
    "修改"
  ],
  "presetDiffViewer.compareRevisions": [
    "Compare revisions",
    "对比修订版"
  ],
  "presetDiffViewer.loadingRevisions": [
    "Loading revisions…",
    "正在加载修订版…"
  ],
  "presetDiffViewer.onlyOneRevisionExistsForThisPresetSoThere": [
    "Only one revision exists for this preset, so there is nothing to compare yet. The comparison becomes available after the next saved revision.",
    "该预设只有一个修订版，暂无可对比内容。保存下一个修订版后即可对比。"
  ],
  "presetDiffViewer.olderRevision": [
    "Older revision",
    "较早修订版"
  ],
  "presetDiffViewer.olderRevisionToCompareForName": [
    "Older revision to compare for {name}",
    "用于对比的 {name} 较早修订版"
  ],
  "presetDiffViewer.newerRevision": [
    "Newer revision",
    "较新修订版"
  ],
  "presetDiffViewer.newerRevisionToCompareForName": [
    "Newer revision to compare for {name}",
    "用于对比的 {name} 较新修订版"
  ],
  "presetDiffViewer.comparingR": [
    "Comparing r",
    "正在比较 r"
  ],
  "presetDiffViewer.actor": [
    ", actor ",
    "，操作者 "
  ],
  "presetDiffViewer.withR": [
    ") with r",
    "）与 r"
  ],
  "presetDiffViewer.revisionsR": [
    "Revisions r",
    "修订版 r"
  ],
  "presetDiffViewer.andR": [
    " and r",
    " 与 r"
  ],
  "presetDiffViewer.haveIdenticalContent": [
    " have identical content.",
    " 的内容相同。"
  ],
  "presetFilters.layerPresetFilters": [
    "Layer preset filters",
    "层预设筛选"
  ],
  "presetFilters.searchPresets": [
    "Search presets",
    "搜索预设"
  ],
  "presetFilters.nameMaterialOrProcess": [
    "Name, material, or process",
    "名称、材料或工艺"
  ],
  "presetFilters.allLayerTypes": [
    "All layer types",
    "全部层类型"
  ],
  "presetFilters.allMethods": [
    "All methods",
    "全部方法"
  ],
  "presetFilters.noProcessRecorded": [
    "No process recorded",
    "未记录工艺"
  ],
  "presetFilters.allScopes": [
    "All scopes",
    "全部范围"
  ],
  "presetFilters.shared": [
    "Shared",
    "共享"
  ],
  "presetFilters.status": [
    "Status",
    "状态"
  ],
  "presetFilters.allStatuses": [
    "All statuses",
    "全部状态"
  ],
  "presetFilters.active": [
    "Active",
    "可用"
  ],
  "presetFilters.inactive": [
    "Inactive",
    "已停用"
  ],
  "presetFilters.records": [
    " records",
    " 条记录"
  ],
  "presetFilters.clearFilters": [
    "Clear filters",
    "清除筛选"
  ],
  "presetPreview.presetPreview": [
    "Preset preview",
    "预设预览"
  ],
  "presetPreview.previewThisCreatesTheNewIndependentPreset": [
    "Preview — this creates the new independent preset ",
    "预览 — 将创建独立的新预设 "
  ],
  "presetPreview.previewThisSavesRevision": [
    "Preview — this saves revision ",
    "预览 — 将保存修订版 "
  ],
  "presetReviseForm.unsavedEditsToThisPresetWereRestoredFromYour": [
    "Unsaved edits to this preset were restored from your last session.",
    "已恢复您上次会话中对该预设的未保存修改。"
  ],
  "presetReviseForm.discardEdits": [
    "Discard edits",
    "放弃修改"
  ],
  "presetReviseForm.layerType": [
    "Layer type ",
    "层类型 "
  ],
  "presetReviseForm.role": [
    " · role ",
    " · 角色 "
  ],
  "presetReviseForm.sourceKeyKey": [
    " · source key {key}",
    "· 源键 {key}"
  ],
  "presetReviseForm.theseIdentityFieldsAreFixedForThisPreset": [
    ". These identity fields are fixed for this preset.",
    "。这些标识字段在当前预设中不可更改。"
  ],
  "presetReviseForm.noPerovskiteDepositionProcessThisLayerTypeRecordsIts": [
    "No perovskite deposition process — this layer type records its process above.",
    "无钙钛矿沉积工艺——该层类型在上方记录其工艺。"
  ],
  "presetReviseForm.savingCreatesRevisionR": [
    "Saving creates revision r",
    "保存后将创建修订版 r"
  ],
  "presetReviseForm.existingExperimentSnapshotsAreNeverChanged": [
    "; existing experiment snapshots are never changed.",
    "；已有实验快照不会改变。"
  ],
  "presetSummaryCard.templateIncomplete": [
    "Template incomplete",
    "模板不完整"
  ],
  "presetSummaryCard.singleLayerTemplate": [
    "Single-layer template",
    "单层模板"
  ],
  "presetSummaryCard.partialTemplate": [
    "Partial template",
    "部分模板"
  ],
  "presetSummaryCard.whatThisTemplateIsStillMissing": [
    "What this template is still missing",
    "此模板还缺少什么"
  ],
  "presetSummaryCard.completeTheseValuesBeforeSavingARevision": [
    "Complete these values before saving a revision",
    "保存修订版前请完成以下内容"
  ],
  "presetSummaryCard.completeIn": [
    " — complete in ",
    " — 请在以下位置补全： "
  ],
  "presetWorkspace.edit": [
    "Edit ",
    "编辑 "
  ],
  "presetWorkspace.currentRevisionR": [
    "Current revision r",
    "当前修订版 r"
  ],
  "presetWorkspace.savingCreatesRevisionR": [
    " — saving creates revision r",
    " — 保存后创建修订版 r"
  ],
  "presetWorkspace.frozenExperimentSnapshotsKeepTheirOwnValues": [
    ". Frozen experiment snapshots keep their own values.",
    "。已固定的实验快照保留原值。"
  ],
  "presetWorkspace.newPreset": [
    "New preset",
    "新建预设"
  ],
  "presetWorkspace.presetsAreOptionalSingleLayerTemplatesExperimentsCanAlso": [
    "Presets are optional single-layer templates — experiments can also be planned from scratch without one.",
    "预设是可选的单层模板——实验也可以不借助预设从零规划。"
  ],
  "presetWorkspace.creationMode": [
    "Creation mode",
    "创建方式"
  ],
  "presetWorkspace.fromScratch": [
    "From scratch",
    "从零创建"
  ],
  "presetWorkspace.noSavedPresetsToCopyYet": [
    "No saved presets to copy yet",
    "暂无可复制的已存预设"
  ],
  "presetWorkspace.copyExistingPreset": [
    "Copy existing preset",
    "复制已有预设"
  ],
  "specificationEditor.advancedEditingIsActiveTheKeyValueRowsBelow": [
    "Advanced editing is active — the key/value rows below are paused. Apply or discard the JSON draft to resume row editing.",
    "高级编辑已激活——下方键/值行已暂停。应用或放弃 JSON 草稿以恢复行编辑。"
  ],
  "specificationEditor.specificationKeyKey": [
    "Specification key {key}",
    "规格键 {key}"
  ],
  "specificationEditor.key": [
    "Key",
    "键"
  ],
  "specificationEditor.valueTypeForKey": [
    "Value type for {key}",
    "{key} 的值类型"
  ],
  "specificationEditor.text": [
    "Text",
    "文本"
  ],
  "specificationEditor.number": [
    "Number",
    "数字"
  ],
  "specificationEditor.onOff": [
    "On/off",
    "开关"
  ],
  "specificationEditor.valueForKey": [
    "Value for {key}",
    "{key} 的值"
  ],
  "specificationEditor.on": [
    "On",
    "开"
  ],
  "specificationEditor.off": [
    "Off",
    "关"
  ],
  "specificationEditor.removeSpecificationRowKey": [
    "Remove specification row {key}",
    "移除规格行 {key}"
  ],
  "specificationEditor.noStructuredSpecificationValuesYetAddAKeyValue": [
    "No structured specification values yet. Add a key/value row or use the advanced editor.",
    "尚无结构化规格值。添加键/值行或使用高级编辑器。"
  ],
  "specificationEditor.keptWithoutChangesEditInTheAdvancedEditor": [
    "Kept without changes (edit in the advanced editor): ",
    "保留原样（请在高级编辑器中编辑）： "
  ],
  "specificationEditor.addSpecificationRow": [
    "Add specification row",
    "添加规格行"
  ],
  "specificationEditor.hideAdvancedSpecificationEditor": [
    "Hide advanced specification editor",
    "隐藏高级规格编辑器"
  ],
  "specificationEditor.advancedSpecificationEditorJSON": [
    "Advanced specification editor (JSON)",
    "高级规格编辑器（JSON）"
  ],
  "specificationEditor.applyOrDiscardTheJSONDraftBeforeSavingThe": [
    "Apply or discard the JSON draft before saving — the form cannot submit while an advanced edit is pending.",
    "保存前请应用或放弃 JSON 草稿——高级编辑未决时表单无法提交。"
  ],
  "specificationEditor.advancedSpecificationJSON": [
    "Advanced specification (JSON)",
    "高级规格（JSON）"
  ],
  "specificationEditor.editsTheCompleteSpecificationIncludingListsAndNestedObjects": [
    "Edits the complete specification, including lists and nested objects the rows cannot represent. Apply commits the draft; rows stay paused until then.",
    "编辑完整规格，包括行无法表示的列表与嵌套对象。应用即提交草稿；在此之前行保持暂停。"
  ],
  "specificationEditor.applyJSONDraft": [
    "Apply JSON draft",
    "应用 JSON 草稿"
  ],
  "materialBrowseCard.noFormulaRecorded": [
    "No formula recorded",
    "未记录分子式"
  ],
  "materialBrowseCard.noSpecificationsRecorded": [
    "No specifications recorded.",
    "未记录规格。"
  ],
  "materialBrowseCard.supplierProduct": [
    " supplier product",
    " 个供应商产品"
  ],
  "materialDetailView.backToDirectory": [
    "← Back to directory",
    "← 返回目录"
  ],
  "materialDetailView.editMaterial": [
    "Edit material",
    "编辑材料"
  ],
  "materialDetailView.name": [
    "Name",
    "名称"
  ],
  "materialDetailView.formula": [
    "Formula",
    "分子式"
  ],
  "materialDetailView.casNumber": [
    "CAS number",
    "CAS 号"
  ],
  "materialDetailView.recordStatus": [
    "Record status",
    "记录状态"
  ],
  "materialDetailView.specification": [
    "Specification",
    "规格"
  ],
  "materialDetailView.valuesRecordedForThisMaterialMissingOptionalValuesAre": [
    "Values recorded for this material. Missing optional values are not inferred.",
    "为该材料记录的数值。缺失的可选值不做推断。"
  ],
  "materialDetailView.noScalarSpecificationValuesRecorded": [
    "No scalar specification values recorded.",
    "未记录标量规格值。"
  ],
  "materialDetailView.rawSpecificationJSON": [
    "Raw specification (JSON)",
    "原始规格（JSON）"
  ],
  "materialDetailView.supplierProducts": [
    "Supplier products",
    "供应商产品"
  ],
  "materialDetailView.eachProductKeepsItsOwnVendorCatalogNumberReview": [
    "Each product keeps its own vendor, catalog number, review status, and specification — independent of the material record's status.",
    "每个产品保留自己的供应商、货号、审核状态与规格——独立于材料记录的状态。"
  ],
  "materialDetailView.noSupplierProductsHaveBeenRecorded": [
    "No supplier products have been recorded.",
    "尚未记录供应商产品。"
  ],
  "materialDetailView.addSupplierProduct": [
    "Add supplier product",
    "添加供应商产品"
  ],
  "materialDetailView.proposeSupplierProduct": [
    "Propose supplier product",
    "提议供应商产品"
  ],
  "materialDetailView.newVendorForName": [
    "New vendor for {name}",
    "{name} 的新供应商"
  ],
  "materialDetailView.newCatalogNumberForName": [
    "New catalog number for {name}",
    "{name} 的新货号"
  ],
  "materialDetailView.addProduct": [
    "Add product",
    "添加产品"
  ],
  "materialDetailView.submitProductForReview": [
    "Submit product for review",
    "提交产品审核"
  ],
  "materialDetailView.editProduct": [
    "Edit product",
    "编辑产品"
  ],
  "materialDetailView.vendorForCatalog": [
    "Vendor for {catalog}",
    "{catalog} 的供应商"
  ],
  "materialDetailView.catalogNumberForMaterialProductId": [
    "Catalog number for {material} product {id}",
    "{material} 产品 {id} 的货号"
  ],
  "materialDetailView.statusForVendorCatalog": [
    "Status for {vendor} {catalog}",
    "{vendor} {catalog} 的状态"
  ],
  "materialDetailView.saveProduct": [
    "Save product",
    "保存产品"
  ],
  "materialWorkspace.editName": [
    "Edit {name}",
    "编辑 {name}"
  ],
  "materialWorkspace.newMaterial": [
    "New material",
    "新建材料"
  ],
  "materialWorkspace.categoryCategoryIsFixedForAnExistingRecordSaving": [
    "Category {category} is fixed for an existing record. Saving updates this record in place.",
    "已有记录的类别 {category} 不可更改。保存将就地更新该记录。"
  ],
  "materialWorkspace.studentsSubmitMaterialsForReviewInstructorsAndAdministratorsAdd": [
    "Students submit materials for review; instructors and administrators add them to the active directory directly.",
    "学生提交材料待审核；导师与管理员可直接添加到正式目录。"
  ],
  "materialWorkspace.materialCategoryFixed": [
    "Material category (fixed)",
    "材料类别（固定）"
  ],
  "materialWorkspace.materialCategory": [
    "Material category",
    "材料类别"
  ],
  "materialWorkspace.materialName": [
    "Material name",
    "材料名称"
  ],
  "materialWorkspace.ordinaryValuesUseKeyValueRowsListsAndNested": [
    "Ordinary values use key/value rows. Lists and nested objects stay untouched in the record and are edited through the advanced editor — nothing is flattened or dropped.",
    "普通值使用键/值行。列表与嵌套对象在记录中保持原样，通过高级编辑器编辑——不会被展平或丢弃。"
  ],
  "materialWorkspace.supplierProductsAreManagedOnTheMaterialSDetail": [
    "Supplier products are managed on the material's detail page, inside the parent material context.",
    "供应商产品在材料详情页中管理，处于所属材料的上下文内。"
  ],
  "materialWorkspace.recordedOpenTheDetailViewToAddOrEdit": [
    " recorded. Open the detail view to add or edit products.",
    " 已记录。请打开详情添加或编辑产品。"
  ],
  "materialWorkspace.saveTheMaterialFirstSupplierProductsAreAddedTo": [
    "Save the material first — supplier products are added to an existing record from its detail page.",
    "请先保存材料——供应商产品在已有记录的详情页中添加。"
  ],
  "materialWorkspace.cardPreview": [
    "Card preview",
    "卡片预览"
  ],
  "materialWorkspace.saveMaterial": [
    "Save material",
    "保存材料"
  ],
  "materialWorkspace.addActiveMaterial": [
    "Add active material",
    "添加正式材料"
  ],
  "materialWorkspace.submitMaterialForReview": [
    "Submit material for review",
    "提交材料审核"
  ],
  "analysisWorkbenchPage.analysisWorkbench": [
    "Analysis workbench",
    "分析工作台"
  ],
  "analysisWorkbenchPage.overlayJVCurvesCompareFrozenPlannedConditionsAnd": [
    "Overlay J-V curves, compare frozen planned conditions, and review campaign-level measurements across characterization results.",
    "叠加 J-V 曲线、对比已固定的计划条件，并跨表征结果查看实验系列级测量。"
  ],
  "analysisWorkbenchPage.loadingTheWorkbench": [
    "Loading the workbench…",
    "正在加载工作台…"
  ],
  "analysisWorkbenchPage.noCharacterizationResultsExistYetUploadAResultFile": [
    "No characterization results exist yet — upload a result file first.",
    "尚无表征结果——请先上传结果文件。"
  ],
  "analysisWorkbenchPage.results": [
    "RESULTS · ",
    "结果 · "
  ],
  "analysisWorkbenchPage.selectedMAX": [
    " SELECTED (MAX 12)",
    " 已选（最多 12 个）"
  ],
  "analysisWorkbenchPage.unnamedExperiment": [
    "Unnamed experiment",
    "未命名实验"
  ],
  "analysisWorkbenchPage.valueBestPCEInCode": [
    " · {value}% best PCE in {code}",
    "· {code} 中最佳 PCE {value}%"
  ],
  "analysisWorkbenchPage.palette": [
    "Palette",
    "配色"
  ],
  "analysisWorkbenchPage.renderOverlay": [
    "Render overlay",
    "渲染叠加图"
  ],
  "analysisWorkbenchPage.compareConditions": [
    "Compare conditions",
    "对比条件"
  ],
  "analysisWorkbenchPage.renderingOverlayFor": [
    "Rendering overlay for ",
    "正在绘制以下数据的叠加图： "
  ],
  "analysisWorkbenchPage.unableToRenderTheOverlayFor": [
    "Unable to render the overlay for ",
    "无法绘制以下数据的叠加图： "
  ],
  "analysisWorkbenchPage.resultsNeedValidForwardJVTracesReviewThe": [
    ". Results need valid forward J-V traces. Review the selected files or try rendering again.",
    "。结果需要有效的正向 J-V 曲线，请检查所选文件或重试。"
  ],
  "analysisWorkbenchPage.crossResultJVOverlayLabels": [
    "Cross-result J-V overlay: {labels}",
    "跨结果 J-V 叠加图：{labels}"
  ],
  "analysisWorkbenchPage.selectResultsAndRenderTheOverlayOneBestForward": [
    "Select results and render the overlay — one best forward curve per result file.",
    "选择结果并渲染叠加图——每个结果文件取一条最佳正向曲线。"
  ],
  "analysisWorkbenchPage.loadingFrozenConditionsForTheSelectedExperiments": [
    "Loading frozen conditions for the selected experiments…",
    "正在加载所选实验已固定的条件…"
  ],
  "analysisWorkbenchPage.unableToCompareTheSelectedExperiments": [
    "Unable to compare the selected experiments: ",
    "无法对比所选实验： "
  ],
  "analysisWorkbenchPage.valuesShowTheSavedPlanForEveryControlAnd": [
    "Values show the saved plan for every control and target condition.",
    "数值显示每个对照与目标条件的已保存计划。"
  ],
  "analysisWorkbenchPage.noFrozenConditionsAreAvailableForTheseExperiments": [
    "No frozen conditions are available for these experiments.",
    "这些实验没有可用的已固定的条件。"
  ],
  "analysisWorkbenchPage.conditionComparisonTable": [
    "Condition comparison table",
    "条件对比表"
  ],
  "analysisWorkbenchPage.frozenPlannedConditionsForAllSelectedExperimentsIncludingControl": [
    "Frozen planned conditions for all selected experiments, including control and target conditions",
    "所有所选实验已固定的计划条件，含对照与目标条件"
  ],
  "baselinesPage.thisBaselineHasNoCompleteDepositionProcessAndCannot": [
    "This baseline has no complete deposition process and cannot be revised.",
    "该基线没有完整的沉积工艺，无法修订。"
  ],
  "baselinesPage.loadingBaselines": [
    "Loading baselines…",
    "正在加载基线…"
  ],
  "baselinesPage.unableToLoadBaselines": [
    "Unable to load baselines.",
    "无法加载基线。"
  ],
  "baselinesPage.baselines": [
    "Baselines",
    "基线"
  ],
  "baselinesPage.completeControlReferenceRecipesUsedAsExperimentStartingPoints": [
    "Complete Control reference recipes used as experiment starting points. Personal baselines belong to their owner; Shared baselines are lab-wide.",
    "用作实验起点的完整对照参考配方。个人基线归其所有者所有；共享基线为全实验室共用。"
  ],
  "baselinesPage.createBaseline": [
    "Create baseline",
    "创建基线"
  ],
  "baselinesPage.assembleANewBaselineFromReusableMaterialsDeviceLayouts": [
    "Assemble a new baseline from reusable materials, device layouts, and layer presets.",
    "用可复用材料、器件布局与层预设组装新基线。"
  ],
  "baselinesPage.instructorAndAdministratorCreationIsSharedALabWide": [
    " Instructor and administrator creation is Shared (a lab-wide starting point).",
    " 导师与管理员创建的是共享基线（全实验室起点）。"
  ],
  "baselinesPage.studentCreationIsPersonalAndVisibleOnlyToYou": [
    " Student creation is Personal and visible only to you until an instructor promotes it to Shared.",
    " 学生创建的是个人基线，仅自己可见，直到导师将其提升为共享。"
  ],
  "baselinesPage.sharedBaselines": [
    "Shared baselines",
    "共享基线"
  ],
  "baselinesPage.personalBaselines": [
    "Personal baselines",
    "个人基线"
  ],
  "baselinesPage.noNounAreAvailable": [
    "No {noun} are available.",
    "暂无可用{noun}。"
  ],
  "baselinesPage.ownedByOwner": [
    "Owned by {owner}",
    "归 {owner} 所有"
  ],
  "baselinesPage.sharedOriginatingOwnerOwner": [
    "Shared · originating owner {owner}",
    "共享 · 原所有者 {owner}"
  ],
  "baselinesPage.sharedCreatedDirectlyByStaff": [
    "Shared · created directly by staff",
    "共享 · 由教职工直接创建"
  ],
  "baselinesPage.promotedByNameOnTimeNote": [
    " · Promoted by {name} on {time}{note}",
    "· 由 {name} 于 {time} 提升{note}"
  ],
  "baselinesPage.promotionNoteForNameOptional": [
    "Promotion note for {name} (optional)",
    "{name} 的提升备注（可选）"
  ],
  "baselinesPage.promote": [
    "Promote ",
    "提升 "
  ],
  "baselinesPage.toShared": [
    " to shared",
    " 为共享"
  ],
  "baselinesPage.reviseBaseline": [
    "Revise baseline",
    "修订基线"
  ],
  "baselinesPage.archive": [
    "Archive ",
    "归档 "
  ],
  "baselinesPage.archiveBaseline": [
    "Archive baseline",
    "归档基线"
  ],
  "baselinesPage.existingExperimentsAndVersionsRetainTheirCompleteSnapshotsThis": [
    "Existing experiments and versions retain their complete snapshots. This baseline will no longer be available to students for new plans.",
    "已有实验与版本保留其完整快照。该基线将不再供学生用于新计划。"
  ],
  "deviationSection.wholeBatch": [
    "Whole batch",
    "整个批次"
  ],
  "deviationSection.preparationCode": [
    "Preparation {code}",
    "准备 {code}"
  ],
  "deviationSection.executionCode": [
    "Execution {code}",
    "执行 {code}"
  ],
  "deviationSection.substrateCode": [
    "Substrate {code}",
    "基底 {code}"
  ],
  "deviationSection.deviceCode": [
    "Device {code}",
    "器件 {code}"
  ],
  "deviationSection.conditionCode": [
    "Condition {code}",
    "条件 {code}"
  ],
  "deviationSection.type": [
    "Type",
    "类型"
  ],
  "deviationSection.general": [
    "general",
    "一般"
  ],
  "deviationSection.fabricationShortfall": [
    "fabrication_shortfall",
    "制备不足"
  ],
  "deviationSection.measurementShortfall": [
    "measurement_shortfall",
    "测量不足"
  ],
  "deviationSection.description": [
    "Description",
    "描述"
  ],
  "deviationSection.plannedValueJSON": [
    "Planned value (JSON)",
    "计划值（JSON）"
  ],
  "deviationSection.actualValueJSON": [
    "Actual value (JSON)",
    "实际值（JSON）"
  ],
  "executionSection.processExecutionCode": [
    "Process execution {code}",
    "工艺执行 {code}"
  ],
  "executionSection.keepCurrent": [
    "Keep current",
    "保持当前"
  ],
  "executionSection.equipmentIdentifier": [
    "Equipment identifier",
    "设备编号"
  ],
  "executionSection.notes": [
    "Notes",
    "备注"
  ],
  "executionSection.saveExecution": [
    "Save execution",
    "保存执行"
  ],
  "executionSection.splitExecution": [
    "Split execution ",
    "拆分执行 "
  ],
  "executionSection.substrate": [
    "substrate ",
    "基底 "
  ],
  "executionSection.layer": [
    ", layer ",
    "，层 "
  ],
  "executionSection.split": [
    "Split",
    "拆分"
  ],
  "executionSection.mergeIntoThisExecution": [
    "Merge into this execution",
    "合并到此执行"
  ],
  "executionSection.selectASourceExecution": [
    "Select a source execution",
    "选择源执行"
  ],
  "executionSection.merge": [
    "Merge",
    "合并"
  ],
  "preparationSection.solutionPreparationCode": [
    "Solution preparation {code}",
    "溶液准备 {code}"
  ],
  "preparationSection.savePreparation": [
    "Save preparation",
    "保存准备"
  ],
  "preparationSection.splitPreparation": [
    "Split preparation ",
    "拆分准备 "
  ],
  "preparationSection.condition": [
    "condition ",
    "条件 "
  ],
  "preparationSection.mergeIntoThisPreparation": [
    "Merge into this preparation",
    "合并到此准备"
  ],
  "preparationSection.selectASourcePreparation": [
    "Select a source preparation",
    "选择源准备"
  ],
  "recordingControl.actualRecording": [
    "Actual recording",
    "实际记录"
  ],
  "recordingControl.notRecordedYet": [
    "Not recorded yet",
    "尚未记录"
  ],
  "recordingControl.recordedAsPlanned": [
    "Recorded as planned",
    "按计划记录"
  ],
  "recordingControl.recordAdjustedParameters": [
    "Record adjusted parameters",
    "记录调整后的参数"
  ],
  "batchDetailPage.markReady": [
    "Mark ready",
    "标记为就绪"
  ],
  "batchDetailPage.startExecution": [
    "Start execution",
    "开始执行"
  ],
  "batchDetailPage.solutionPreparation": [
    "Solution preparation",
    "溶液准备"
  ],
  "batchDetailPage.cancelBatch": [
    "Cancel batch",
    "取消批次"
  ],
  "batchDetailPage.mergePreparation": [
    "Merge preparation",
    "合并准备"
  ],
  "batchDetailPage.mergeExecution": [
    "Merge execution",
    "合并执行"
  ],
  "batchDetailPage.invalidBatch": [
    "Invalid batch",
    "无效批次"
  ],
  "batchDetailPage.theFabricationBatchIdentifierIsNotValid": [
    "The fabrication batch identifier is not valid.",
    "制备批次标识符无效。"
  ],
  "batchDetailPage.unableToRefreshRunSheet": [
    "Unable to refresh run sheet",
    "无法刷新制备记录单"
  ],
  "batchDetailPage.unableToRefreshTheRunSheetTheDisplayedData": [
    "Unable to refresh the run sheet. The displayed data may be outdated; verify the current batch state before continuing.",
    "无法刷新制备记录单。显示的数据可能已过期；继续前请核实当前批次状态。"
  ],
  "batchDetailPage.loadingRunSheet": [
    "Loading run sheet…",
    "正在加载制备记录单…"
  ],
  "batchDetailPage.unableToLoadRunSheet": [
    "Unable to load run sheet",
    "无法加载制备记录单"
  ],
  "batchDetailPage.theRunSheetCouldNotBeLoaded": [
    "The run sheet could not be loaded.",
    "制备记录单加载失败。"
  ],
  "batchDetailPage.batchNotFound": [
    "Batch not found",
    "未找到批次"
  ],
  "batchDetailPage.theBatchDoesNotBelongToTheRequestedExperiment": [
    "The batch does not belong to the requested experiment.",
    "该批次不属于所请求的实验。"
  ],
  "batchDetailPage.fabricationBatchNFrozenConditionSnapshot": [
    "Fabrication batch {n} · frozen condition snapshot",
    "制备批次 {n} · 已固定的条件快照"
  ],
  "batchDetailPage.exportJSON": [
    "Export JSON",
    "导出 JSON"
  ],
  "batchDetailPage.exportPDF": [
    "Export PDF",
    "导出 PDF"
  ],
  "batchDetailPage.backToPlan": [
    "Back to plan",
    "返回计划"
  ],
  "batchDetailPage.batchStatus": [
    "Batch status",
    "批次状态"
  ],
  "batchDetailPage.noBatchNotes": [
    "No batch notes.",
    "无批次备注。"
  ],
  "batchDetailPage.recorded": [
    "Recorded ",
    "记录时间 "
  ],
  "batchDetailPage.preparations": [
    " preparations ·",
    " 项准备 ·"
  ],
  "batchDetailPage.executions": [
    " executions",
    " 项执行"
  ],
  "batchDetailPage.recordAllAsPlanned": [
    "Record all as planned (",
    "全部按计划记录（"
  ],
  "batchDetailPage.runSheetSections": [
    "Run sheet sections",
    "制备记录单分区"
  ],
  "batchDetailPage.jumpTo": [
    "Jump to",
    "跳转至"
  ],
  "batchDetailPage.preparations2": [
    "Preparations (",
    "准备（"
  ],
  "batchDetailPage.executions2": [
    "Executions (",
    "执行（"
  ],
  "batchDetailPage.deviations": [
    "Deviations (",
    "偏差（"
  ],
  "batchDetailPage.conditions": [
    "Conditions",
    "条件"
  ],
  "batchDetailPage.frozenConditions": [
    "Frozen conditions",
    "已固定的条件"
  ],
  "batchDetailPage.code": [
    "Code",
    "编号"
  ],
  "batchDetailPage.substratesDevices": [
    "Substrates & devices",
    "基底与器件"
  ],
  "batchDetailPage.substrates": [
    " substrates",
    " 片基底"
  ],
  "batchDetailPage.mark": [
    "Mark",
    "标记"
  ],
  "batchDetailPage.nDevices": [
    "{n} devices",
    "{n} 个器件"
  ],
  "batchDetailPage.runSheet": [
    "Run sheet",
    "制备记录单"
  ],
  "batchDetailPage.preparations3": [
    " preparations · ",
    " 项准备 · "
  ],
  "batchDetailPage.nothingToRecordOnThisRunSheetYet": [
    "Nothing to record on this run sheet yet.",
    "此制备记录单暂无可记录内容。"
  ],
  "batchDetailPage.advancedSplitMergeAndFullRecordingForms": [
    "Advanced: split, merge, and full recording forms",
    "高级：拆分、合并与完整记录表单"
  ],
  "batchDetailPage.deviations2": [
    "Deviations",
    "偏差"
  ],
  "batchDetailPage.noDeviationsRecorded": [
    "No deviations recorded.",
    "未记录偏差。"
  ],
  "batchDetailPage.recorded2": [
    "Recorded",
    "记录时间"
  ],
  "batchDetailPage.confirm": [
    "Confirm",
    "确认"
  ],
  "campaignsPage.purpose": [
    "Purpose",
    "目的"
  ],
  "campaignsPage.manage": [
    "Manage",
    "管理"
  ],
  "campaignsPage.statusFor": [
    "Status for ",
    "以下对象的状态： "
  ],
  "campaignsPage.statusForName": [
    "Status for {name}",
    "{name} 的状态"
  ],
  "campaignsPage.loadingCampaigns": [
    "Loading Campaigns…",
    "正在加载实验系列…"
  ],
  "campaignsPage.unableToLoadCampaigns": [
    "Unable to load Campaigns.",
    "无法加载实验系列。"
  ],
  "campaignsPage.campaigns": [
    "Campaigns",
    "实验系列"
  ],
  "campaignsPage.organizeRelatedExperimentsUnderStableSeriesIdentifiers": [
    "Organize related experiments under stable series identifiers.",
    "在稳定的系列标识下组织相关实验。"
  ],
  "campaignsPage.activeSeriesAvailableForNewExperimentPlans": [
    "Active series available for new experiment plans.",
    "可用于新实验计划的进行中系列。"
  ],
  "campaignsPage.createCampaign": [
    "Create Campaign",
    "创建实验系列"
  ],
  "campaignsPage.campaignCode": [
    "Campaign code",
    "实验系列编号"
  ],
  "campaignsPage.displayName": [
    "Display name",
    "显示名称"
  ],
  "campaignsPage.campaignDirectory": [
    "Campaign directory",
    "实验系列目录"
  ],
  "campaignsPage.noCampaignsAreAvailable": [
    "No Campaigns are available.",
    "暂无可用实验系列。"
  ],
  "campaignWorkspacePage.planStatusUpdatedTime": [
    "Plan {status} · updated {time}",
    "计划{status} · 更新于 {time}"
  ],
  "campaignWorkspacePage.openExperiment": [
    "Open experiment",
    "打开实验"
  ],
  "campaignWorkspacePage.experimentId": [
    "Experiment {id}",
    "实验 {id}"
  ],
  "campaignWorkspacePage.openRunSheet": [
    "Open run sheet",
    "打开制备记录单"
  ],
  "campaignWorkspacePage.openResult": [
    "Open result",
    "打开结果"
  ],
  "campaignWorkspacePage.unableToLoadTheCampaignWorkspace": [
    "Unable to load the campaign workspace",
    "无法加载实验系列工作区"
  ],
  "campaignWorkspacePage.loadingCampaignWorkspace": [
    "Loading campaign workspace…",
    "正在加载实验系列工作区…"
  ],
  "campaignWorkspacePage.campaignNotFound": [
    "Campaign not found",
    "未找到实验系列"
  ],
  "campaignWorkspacePage.noCampaignWithCodeCode": [
    "No campaign with code \"{code}\".",
    "没有编号为\"{code}\"的实验系列。"
  ],
  "campaignWorkspacePage.codeStatusNRecordsInThePipeline": [
    "{code} · {status} · {n} records in the pipeline",
    "{code} · {status} · 流水线中 {n} 条记录"
  ],
  "campaignWorkspacePage.allCampaigns": [
    "All campaigns",
    "全部实验系列"
  ],
  "campaignWorkspacePage.nothingInThePipelineForThisCampaignYet": [
    "Nothing in the pipeline for this campaign yet.",
    "该实验系列的流程暂无记录。"
  ],
  "campaignWorkspacePage.experimentsAppearHereOnceAPlanIsCreatedUnder": [
    "Experiments appear here once a plan is created under this campaign.",
    "在该实验系列下创建计划后，实验将显示在此处。"
  ],
  "campaignWorkspacePage.campaignRecords": [
    "Campaign records",
    "实验系列记录"
  ],
  "campaignWorkspacePage.recordDetails": [
    "Record details",
    "记录详情"
  ],
  "campaignWorkspacePage.campaignStageCode": [
    "Campaign › {Stage} › {code}",
    "实验系列 › {Stage} › {code}"
  ],
  "campaignWorkspacePage.selectARecordFromTheLeftRail": [
    "Select a record from the left rail",
    "从左侧栏选择一条记录"
  ],
  "campaignWorkspacePage.thePaneShowsItsPipelineStageStatusAndA": [
    "The pane shows its pipeline stage, status, and a link to the full page.",
    "该面板显示其流水线阶段、状态以及指向完整页面的链接。"
  ],
  "deviceLayoutsPage.areaDevice": [
    "Area / device",
    "面积 / 器件"
  ],
  "deviceLayoutsPage.totalActiveArea": [
    "Total active area",
    "总有效面积"
  ],
  "deviceLayoutsPage.version": [
    "Version",
    "版本"
  ],
  "deviceLayoutsPage.loadingDeviceLayouts": [
    "Loading device layouts…",
    "正在加载器件布局…"
  ],
  "deviceLayoutsPage.unableToLoadDeviceLayouts": [
    "Unable to load device layouts.",
    "无法加载器件布局。"
  ],
  "deviceLayoutsPage.deviceLayouts": [
    "Device layouts",
    "器件布局"
  ],
  "deviceLayoutsPage.versionedSubstrateGeometryUsedToCalculatePhysicalDevicesAnd": [
    "Versioned substrate geometry used to calculate physical devices and active area. Students cannot plan experiments until at least one layout exists.",
    "用于计算物理器件与有效面积的版本化基底几何。至少存在一个布局后学生才能规划实验。"
  ],
  "deviceLayoutsPage.createADeviceLayout": [
    "Create a device layout",
    "创建器件布局"
  ],
  "deviceLayoutsPage.layoutRowsAreImmutableToChangeAGeometryCreate": [
    "Layout rows are immutable. To change a geometry, create a new row with the same code and a bumped version — historical conditions keep their original layout. Students see every code at its latest version.",
    "布局行不可变。要修改几何，请用相同编号新建一行并提升版本——历史条件保留其原布局。学生看到每个编号的最新版本。"
  ],
  "deviceLayoutsPage.shortStableIdentifierEGXDual": [
    "Short stable identifier, e.g. 15x15_dual_005.",
    "简短稳定的标识符，例如 15x15_dual_005。"
  ],
  "deviceLayoutsPage.substrateWidthMm": [
    "Substrate width (mm)",
    "基底宽度 (mm)"
  ],
  "deviceLayoutsPage.substrateLengthMm": [
    "Substrate length (mm)",
    "基底长度 (mm)"
  ],
  "deviceLayoutsPage.activeAreaPerDeviceCm": [
    "Active area per device (cm²)",
    "每器件有效面积 (cm²)"
  ],
  "deviceLayoutsPage.totalActiveAreaCm": [
    "Total active area (cm²)",
    "总有效面积 (cm²)"
  ],
  "deviceLayoutsPage.createLayout": [
    "Create layout",
    "创建布局"
  ],
  "deviceLayoutsPage.deviceLayoutDirectory": [
    "Device layout directory",
    "器件布局目录"
  ],
  "deviceLayoutsPage.noDeviceLayoutsExistYet": [
    "No device layouts exist yet.",
    "尚无器件布局。"
  ],
  "deviceLayoutsPage.studentsCannotPlanExperimentsUntilYouCreateTheFirst": [
    "Students cannot plan experiments until you create the first layout above.",
    "您在上方创建第一个布局后，学生才能规划实验。"
  ],
  "deviceLayoutsPage.noDeviceLayoutsAreAvailable": [
    "No device layouts are available.",
    "暂无可用器件布局。"
  ],
  "deviceLayoutsPage.askYourAdministratorToCreateTheDeviceLayouts": [
    "Ask your administrator to create the device layouts.",
    "请管理员创建器件布局。"
  ],
  "experimentBuilderPage.layerStack": [
    "Layer stack",
    "层堆叠"
  ],
  "experimentBuilderPage.review": [
    "Review",
    "检查"
  ],
  "experimentBuilderPage.loadingExperimentPlanningCatalogs": [
    "Loading experiment-planning catalogs…",
    "正在加载实验规划目录…"
  ],
  "experimentBuilderPage.unableToLoadThePlanningWorkspace": [
    "Unable to load the planning workspace",
    "无法加载规划工作区"
  ],
  "experimentBuilderPage.theReusableDirectoriesDidNotRespond": [
    "The reusable directories did not respond.",
    "可复用目录未响应。"
  ],
  "experimentBuilderPage.planExperiment": [
    "Plan experiment",
    "规划实验"
  ],
  "experimentBuilderPage.buildACompleteIndependentlyReconstructibleFabricationPlanFromVersioned": [
    "Build a complete, independently reconstructible fabrication plan from versioned reusable inputs.",
    "从带版本的可复用输入构建完整、可独立复现的制备计划。"
  ],
  "experimentBuilderPage.experimentPlanningSteps": [
    "Experiment planning steps",
    "实验规划步骤"
  ],
  "experimentBuilderPage.currentDeviceStack": [
    "Current device stack",
    "当前器件堆叠"
  ],
  "experimentBuilderPage.currentStack": [
    "Current stack",
    "当前堆叠"
  ],
  "experimentBuilderPage.completeEachStepThenReviewThePlanBeforeSaving": [
    "Complete each step, then review the plan before saving.",
    "完成各步骤，然后在保存前检查计划。"
  ],
  "experimentBuilderPage.allRequiredPlanningValuesAreComplete": [
    "All required planning values are complete.",
    "所有必填规划值已完成。"
  ],
  "experimentBuilderPage.nReviewItemsRemain": [
    "{n} review items remain.",
    "还剩 {n} 项待检查。"
  ],
  "experimentBuilderPage.saveExperiment": [
    "Save experiment",
    "保存实验"
  ],
  "experimentBuilderPage.replaceCurrentDraft": [
    "Replace current draft?",
    "替换当前草稿？"
  ],
  "experimentBuilderPage.selectingADifferentStartingPointReplacesTheDraftYou": [
    "Selecting a different starting point replaces the draft you are editing, including any recorded layers, conditions, and process values. This cannot be undone.",
    "选择不同的起点将替换您正在编辑的草稿，包括已记录的层、条件和工艺值。此操作不可撤销。"
  ],
  "experimentBuilderPage.discardEditsAndReplace": [
    "Discard edits and replace",
    "放弃修改并替换"
  ],
  "experimentDetailPage.submitForApproval": [
    "Submit for approval",
    "提交审批"
  ],
  "experimentDetailPage.approvePlan": [
    "Approve plan",
    "批准计划"
  ],
  "experimentDetailPage.releaseApprovedPlan": [
    "Release approved plan",
    "发布已批准计划"
  ],
  "experimentDetailPage.startFabrication": [
    "Start fabrication",
    "开始制备"
  ],
  "experimentDetailPage.completeFabrication": [
    "Complete fabrication",
    "完成制备"
  ],
  "experimentDetailPage.invalidExperiment": [
    "Invalid experiment",
    "无效实验"
  ],
  "experimentDetailPage.theExperimentIdentifierIsNotValid": [
    "The experiment identifier is not valid.",
    "实验标识符无效。"
  ],
  "experimentDetailPage.loadingExperiment": [
    "Loading experiment…",
    "正在加载实验…"
  ],
  "experimentDetailPage.unableToLoadExperiment": [
    "Unable to load experiment",
    "无法加载实验"
  ],
  "experimentDetailPage.theExperimentCouldNotBeLoaded": [
    "The experiment could not be loaded.",
    "实验加载失败。"
  ],
  "experimentDetailPage.planTypePlanInCampaignId": [
    "{plan_type} plan in {campaign_id}.",
    "{campaign_id} 中的{plan_type}计划。"
  ],
  "experimentDetailPage.backToRecords": [
    "Back to records",
    "返回记录"
  ],
  "experimentDetailPage.planSummary": [
    "Plan summary",
    "计划摘要"
  ],
  "experimentDetailPage.planActions": [
    "Plan actions",
    "计划操作"
  ],
  "experimentDetailPage.cancelPlan": [
    "Cancel plan",
    "取消计划"
  ],
  "experimentDetailPage.planContentChangedAfterYouLoadedItTheLatest": [
    "Plan content changed after you loaded it. The latest version is shown below — review it again before approving.",
    "计划内容在您加载后已被修改。下方显示最新版本——请在批准前重新审查。"
  ],
  "experimentDetailPage.noFabricationBatchesYetFreezeAtLeastOneBatch": [
    "No fabrication batches yet. Freeze at least one batch below before starting or completing fabrication — characterization CSV uploads require a batch.",
    "尚无制备批次。开始或完成制备前，请先在下方创建至少一个制备批次——表征 CSV 上传需要批次。"
  ],
  "experimentDetailPage.fabricationBatches": [
    "Fabrication batches",
    "制备批次"
  ],
  "experimentDetailPage.batchNotes": [
    "Batch notes",
    "批次备注"
  ],
  "experimentDetailPage.freezeFabricationBatch": [
    "Freeze fabrication batch",
    "创建制备批次"
  ],
  "experimentDetailPage.noFabricationBatchesYet": [
    "No fabrication batches yet.",
    "尚无制备批次。"
  ],
  "experimentDetailPage.freezeABatchFromTheApprovedConditionSnapshotsAbove": [
    "Freeze a batch from the approved condition snapshots above — starting fabrication and CSV result uploads both require at least one batch.",
    "从上方已批准的条件快照创建制备批次——开始制备和 CSV 结果上传都至少需要一个批次。"
  ],
  "experimentDetailPage.releaseThePlanBeforeFreezingExecutionRecords": [
    "Release the plan before freezing execution records.",
    "创建制备批次并固定计划快照前，请先发布计划。"
  ],
  "experimentDetailPage.noNotes": [
    "No notes",
    "无备注"
  ],
  "experimentDetailPage.characterizationResults": [
    "Characterization results",
    "表征结果"
  ],
  "experimentDetailPage.uploadResults": [
    "Upload results",
    "上传结果"
  ],
  "experimentDetailPage.noCharacterizationResultsUploaded": [
    "No characterization results uploaded.",
    "尚未上传表征结果。"
  ],
  "experimentDetailPage.viewDirectionSpecificStatistics": [
    "View direction-specific statistics",
    "查看分方向统计"
  ],
  "experimentsPage.experiment": [
    "Experiment",
    "实验"
  ],
  "experimentsPage.bestPCE": [
    "Best PCE",
    "最佳 PCE"
  ],
  "experimentsPage.plan": [
    "Plan",
    "计划"
  ],
  "experimentsPage.record": [
    "Record",
    "记录"
  ],
  "experimentsPage.loadingExperiments": [
    "Loading experiments…",
    "正在加载实验…"
  ],
  "experimentsPage.unableToLoadExperiments": [
    "Unable to load experiments.",
    "无法加载实验。"
  ],
  "experimentsPage.experiments": [
    "Experiments",
    "实验"
  ],
  "experimentsPage.plansAndRecordsAcrossAllCampaigns": [
    "Plans and records across all campaigns.",
    "跨所有实验系列的计划与记录。"
  ],
  "experimentsPage.planNewExperiment": [
    "Plan new experiment",
    "规划新实验"
  ],
  "experimentsPage.experimentFilters": [
    "Experiment filters",
    "实验筛选"
  ],
  "experimentsPage.allCampaigns": [
    "All Campaigns",
    "全部实验系列"
  ],
  "experimentsPage.planStatus": [
    "Plan status",
    "计划状态"
  ],
  "experimentsPage.searchExperiments": [
    "Search experiments",
    "搜索实验"
  ],
  "experimentsPage.codeCampaignOrMaterial": [
    "Code, Campaign, or material",
    "编号、实验系列或材料"
  ],
  "experimentsPage.experimentRecords": [
    "Experiment records",
    "实验记录"
  ],
  "experimentsPage.noExperimentsMatchTheseFilters": [
    "No experiments match these filters.",
    "没有符合筛选条件的实验。"
  ],
  "fabricationBatchesPage.loadingFabricationBatches": [
    "Loading fabrication batches…",
    "正在加载制备批次…"
  ],
  "fabricationBatchesPage.unableToLoadFabricationBatches": [
    "Unable to load fabrication batches",
    "无法加载制备批次"
  ],
  "fabricationBatchesPage.theFabricationBatchesCouldNotBeLoaded": [
    "The fabrication batches could not be loaded.",
    "制备批次加载失败。"
  ],
  "fabricationBatchesPage.unableToRefreshFabricationBatches": [
    "Unable to refresh fabrication batches: ",
    "无法刷新制备批次： "
  ],
  "fabricationBatchesPage.theRequestFailed": [
    "the request failed.",
    "请求失败。"
  ],
  "fabricationBatchesPage.theDisplayedResultsMayNotMatchTheSelectedFilter": [
    "The displayed results may not match the selected filter.",
    "显示的结果可能与当前筛选条件不一致。"
  ],
  "fabricationBatchesPage.fabricationBatchesAcrossAllCampaignsNewestFirst": [
    "Fabrication batches across all campaigns, newest first.",
    "跨所有实验系列的制备批次，最新在前。"
  ],
  "fabricationBatchesPage.batchRecords": [
    "Batch records",
    "批次记录"
  ],
  "fabricationBatchesPage.fabricationBatchesAppearHereOnceAPlanIsReleased": [
    "Fabrication batches appear here once a plan is released and a batch is frozen.",
    "计划发布并创建制备批次后，制备批次将显示在此处。"
  ],
  "fabricationBatchesPage.bestPCEXJscYMACm": [
    "Best PCE {x} % · Jsc {y} mA/cm²",
    "最佳 PCE {x} % · Jsc {y} mA/cm²"
  ],
  "fabricationBatchesPage.noMeasuredResultsYet": [
    "No measured results yet.",
    "暂无测量结果。"
  ],
  "fabricationBatchesPage.created": [
    "Created ",
    "创建时间 "
  ],
  "layerPresetsPage.loadingLayerPresets": [
    "Loading layer presets…",
    "正在加载层预设…"
  ],
  "layerPresetsPage.unableToLoadLayerPresets": [
    "Unable to load layer presets.",
    "无法加载层预设。"
  ],
  "layerPresetsPage.sharedPresets": [
    "Shared presets",
    "共享预设"
  ],
  "layerPresetsPage.myPresets": [
    "My presets",
    "我的预设"
  ],
  "layerPresetsPage.studentPersonalPresetsPromoteToShared": [
    "Student personal presets — promote to shared",
    "学生个人预设——提升为共享"
  ],
  "layerPresetsPage.noGroupMatchTheCurrentView": [
    "No {group} match the current view.",
    "暂无符合当前视图的{group}。"
  ],
  "layerPresetsPage.thisPresetIsNoLongerInTheVisibleLibrary": [
    "This preset is no longer in the visible library.",
    "该预设已不在可见库中。"
  ],
  "layerPresetsPage.backToLibrary": [
    "Back to library",
    "返回库"
  ],
  "layerPresetsPage.layerPresets": [
    "Layer presets",
    "层预设"
  ],
  "layerPresetsPage.reusableSingleLayerInputTemplatesSelectingAPresetCopies": [
    "Reusable single-layer input templates. Selecting a preset copies its complete values into an editable experiment configuration.",
    "可复用的单层输入模板。选择预设会将其完整值复制到可编辑的实验配置中。"
  ],
  "materialsPage.loadingMaterials": [
    "Loading materials…",
    "正在加载材料…"
  ],
  "materialsPage.unableToLoadMaterials": [
    "Unable to load materials.",
    "无法加载材料。"
  ],
  "materialsPage.materialFilters": [
    "Material filters",
    "材料筛选"
  ],
  "materialsPage.searchMaterials": [
    "Search materials",
    "搜索材料"
  ],
  "materialsPage.nameFormulaCASOrSpecification": [
    "Name, formula, CAS, or specification",
    "名称、分子式、CAS 或规格"
  ],
  "materialsPage.allCategories": [
    "All categories",
    "全部类别"
  ],
  "materialsPage.noMaterialsHaveBeenRecorded": [
    "No materials have been recorded.",
    "尚未记录任何材料。"
  ],
  "materialsPage.addTheFirstReusableMaterialToStartTheDirectory": [
    "Add the first reusable material to start the directory.",
    "添加第一种可复用材料以建立目录。"
  ],
  "materialsPage.noMaterialsMatchTheCurrentFilters": [
    "No materials match the current filters.",
    "没有符合当前筛选的材料。"
  ],
  "materialsPage.thisMaterialIsNoLongerInTheVisibleDirectory": [
    "This material is no longer in the visible directory.",
    "该材料已不在可见目录中。"
  ],
  "materialsPage.backToDirectory": [
    "Back to directory",
    "返回目录"
  ],
  "materialsPage.materialDirectory": [
    "Material directory",
    "材料目录"
  ],
  "materialsPage.reusableMaterialsAndSupplierProductsForExperimentPlanningStudent": [
    "Reusable materials and supplier products for experiment planning. Student submissions remain pending until reviewed.",
    "用于实验规划的可复用材料与供应商产品。学生提交的内容在审核前保持待审状态。"
  ],
  "overviewPage.noDeviceLayoutsYet": [
    "No device layouts yet",
    "暂无器件布局"
  ],
  "overviewPage.anAdministratorCreatesTheFirstDeviceLayoutSubstrateSize": [
    "An administrator creates the first device layout (substrate size, devices per substrate) under Device layouts.",
    "管理员在\"器件布局\"中创建第一个器件布局（基底尺寸、每基底器件数）。"
  ],
  "overviewPage.askAnAdministratorToCreateTheFirstDeviceLayout": [
    "Ask an administrator to create the first device layout under Device layouts.",
    "请管理员在\"器件布局\"中创建第一个器件布局。"
  ],
  "overviewPage.openDeviceLayouts": [
    "Open device layouts",
    "打开器件布局"
  ],
  "overviewPage.noActiveCampaignYet": [
    "No active campaign yet",
    "暂无进行中的实验系列"
  ],
  "overviewPage.everyExperimentBelongsToACampaignCreateTheFirst": [
    "Every experiment belongs to a campaign. Create the first active campaign under Campaigns.",
    "每个实验都归属于一个实验系列。请在\"实验系列\"中创建第一个进行中的实验系列。"
  ],
  "overviewPage.askAnInstructorToCreateTheFirstActiveCampaign": [
    "Ask an instructor to create the first active campaign under Campaigns.",
    "请导师在\"实验系列\"中创建第一个进行中的实验系列。"
  ],
  "overviewPage.openCampaigns": [
    "Open campaigns",
    "打开实验系列"
  ],
  "overviewPage.finishTheFirstUseSetup": [
    "Finish the first-use setup",
    "完成首次使用设置"
  ],
  "overviewPage.series": [
    "Series",
    "实验系列"
  ],
  "overviewPage.loadingOverviewData": [
    "Loading overview data",
    "正在加载总览数据"
  ],
  "overviewPage.loadingOverviewData2": [
    "Loading overview data…",
    "正在加载总览数据…"
  ],
  "overviewPage.assignFilename": [
    "Assign {filename}",
    "关联 {filename}"
  ],
  "overviewPage.assignSubstrateConditionsToUseThisResultInStatistics": [
    "Assign substrate conditions to use this result in statistics and uniformity.",
    "将基底与实验条件关联，以便在统计和均匀性分析中使用该结果。"
  ],
  "overviewPage.continueBatchCode": [
    "Continue {batch_code}",
    "继续 {batch_code}"
  ],
  "overviewPage.recordFabricationStepsAndCompleteTheRunSheet": [
    "Record fabrication steps and complete the run sheet.",
    "记录制备步骤并完成制备记录单。"
  ],
  "overviewPage.startBatchCode": [
    "Start {batch_code}",
    "开始 {batch_code}"
  ],
  "overviewPage.theRunSheetIsReadyForFabrication": [
    "The run sheet is ready for fabrication.",
    "制备记录单已就绪，可开始制备。"
  ],
  "overviewPage.prepareBatchCode": [
    "Prepare {batch_code}",
    "准备 {batch_code}"
  ],
  "overviewPage.finishTheRunSheetAndMarkTheBatchReady": [
    "Finish the run sheet and mark the batch ready.",
    "完成制备记录单并将批次标记为就绪。"
  ],
  "overviewPage.uploadResultsForBatchCode": [
    "Upload results for {batch_code}",
    "上传 {batch_code} 的结果"
  ],
  "overviewPage.addTheMeasurementCSVThenAssignEachSubstrateTo": [
    "Add the measurement CSV, then assign each substrate to its condition.",
    "添加测量 CSV，然后将每片基底与对应条件关联。"
  ],
  "overviewPage.approveExperimentCode": [
    "Approve {experiment_code}",
    "审批 {experiment_code}"
  ],
  "overviewPage.reviewTheSubmittedPlanBeforeFabrication": [
    "Review the submitted plan before fabrication.",
    "制备前审查已提交的计划。"
  ],
  "overviewPage.finishAndSubmitTheDraftPlan": [
    "Finish and submit the draft plan.",
    "完成并提交计划草稿。"
  ],
  "overviewPage.releaseExperimentCode": [
    "Release {experiment_code}",
    "发布 {experiment_code}"
  ],
  "overviewPage.releaseTheApprovedPlanBeforeFreezingAFabricationBatch": [
    "Release the approved plan before freezing a fabrication batch.",
    "创建制备批次前，先发布已批准计划。"
  ],
  "overviewPage.freezeABatchForExperimentCode": [
    "Freeze a batch for {experiment_code}",
    "为 {experiment_code} 创建制备批次"
  ],
  "overviewPage.atLeastOneActiveBatchIsRequiredToStart": [
    "At least one active batch is required to start fabrication.",
    "开始制备至少需要一个活跃的批次。"
  ],
  "overviewPage.startFabricationForExperimentCode": [
    "Start fabrication for {experiment_code}",
    "开始 {experiment_code} 的制备"
  ],
  "overviewPage.thePlanHasAFabricationBatchAndCanEnter": [
    "The plan has a fabrication batch and can enter the in-progress stage.",
    "该计划已有制备批次，可进入进行中阶段。"
  ],
  "overviewPage.completeExperimentCode": [
    "Complete {experiment_code}",
    "完成 {experiment_code}"
  ],
  "overviewPage.allFabricationBatchesAreTerminalFinishThePlanLifecycle": [
    "All fabrication batches are terminal; finish the plan lifecycle.",
    "所有制备批次均已结束；请完成该计划的生命周期。"
  ],
  "overviewPage.waitingForInstructorApprovalBeforeThePlanCanBe": [
    "Waiting for instructor approval before the plan can be released.",
    "等待导师审批后方可发布计划。"
  ],
  "overviewPage.overview": [
    "Overview",
    "总览"
  ],
  "overviewPage.laboratoryActivityAtAGlance": [
    "Laboratory activity at a glance.",
    "实验室动态一览。"
  ],
  "overviewPage.pipelineBoard": [
    "Pipeline board",
    "流水线看板"
  ],
  "overviewPage.nextActions": [
    "Next actions",
    "待办事项"
  ],
  "overviewPage.noWorkNeedsAttentionRightNow": [
    "No work needs attention right now.",
    "当前没有需要处理的工作。"
  ],
  "overviewPage.nExperimentsViewAllExperiments": [
    "{n} experiments, view all experiments",
    "{n} 个实验，查看全部实验"
  ],
  "overviewPage.viewCampaigns": [
    "View campaigns",
    "查看实验系列"
  ],
  "overviewPage.activeCampaigns": [
    "Active campaigns",
    "进行中的实验系列"
  ],
  "overviewPage.nMaterialsViewAllMaterials": [
    "{n} materials, view all materials",
    "{n} 种材料，查看全部材料"
  ],
  "overviewPage.materials": [
    "Materials",
    "材料"
  ],
  "overviewPage.noExperimentsYet": [
    "No experiments yet.",
    "暂无实验。"
  ],
  "overviewPage.startByPlanningYourFirstComparativeDepositionExperiment": [
    "Start by planning your first comparative deposition experiment.",
    "从规划您的第一个对比沉积实验开始。"
  ],
  "overviewPage.planAnExperiment": [
    "Plan an experiment",
    "规划实验"
  ],
  "overviewPage.recentExperiments": [
    "Recent experiments",
    "最近实验"
  ],
  "overviewPage.viewAll": [
    "View all",
    "查看全部"
  ],
  "resultDetailPage.allDevices": [
    "All devices",
    "全部器件"
  ],
  "resultDetailPage.excludeFlaggedDevicesN": [
    "Exclude flagged devices ({n})",
    "排除已标记器件（{n}）"
  ],
  "resultDetailPage.unsavedPreview": [
    "Unsaved preview",
    "未保存的预览"
  ],
  "resultDetailPage.assignSubstrateIdTo": [
    "Assign {substrate_id} to",
    "将 {substrate_id} 与以下条件关联"
  ],
  "resultDetailPage.chooseACondition": [
    "Choose a condition…",
    "请选择条件…"
  ],
  "resultDetailPage.inconsistentConditionAssignmentTheDeviceRowsForThisSubstrate": [
    "Inconsistent condition assignment: the device rows for this substrate disagree. Review the saved assignments.",
    "条件关联不一致：该基底的器件行互相矛盾。请检查已保存的关联。"
  ],
  "resultDetailPage.correctionReason": [
    "Correction reason",
    "更正原因"
  ],
  "resultDetailPage.assignmentCorrectionReason": [
    "Assignment correction reason",
    "关联更正原因"
  ],
  "resultDetailPage.saveAssignments": [
    "Save assignments",
    "保存关联"
  ],
  "resultDetailPage.parsedDevices": [
    "Parsed devices",
    "解析器件"
  ],
  "resultDetailPage.traces": [
    "Traces",
    "曲线"
  ],
  "resultDetailPage.noValidTrace": [
    "No valid trace",
    "无有效曲线"
  ],
  "resultDetailPage.noSavedAssignmentProvenanceRows": [
    "No saved assignment provenance rows.",
    "暂无已保存的关联溯源记录。"
  ],
  "resultDetailPage.analysisDevice": [
    "Analysis device",
    "分析器件"
  ],
  "resultDetailPage.analysisSubstrate": [
    "Analysis substrate",
    "分析基底"
  ],
  "resultDetailPage.instrumentLabel": [
    "Instrument label",
    "仪器标签"
  ],
  "resultDetailPage.fabricationDevice": [
    "Fabrication device",
    "制备器件"
  ],
  "resultDetailPage.batchCondition": [
    "Batch condition",
    "批次条件"
  ],
  "resultDetailPage.invalidResult": [
    "Invalid result",
    "无效结果"
  ],
  "resultDetailPage.theResultIdentifierIsNotValid": [
    "The result identifier is not valid.",
    "结果标识符无效。"
  ],
  "resultDetailPage.loadingResult": [
    "Loading result…",
    "正在加载结果…"
  ],
  "resultDetailPage.unableToLoadResult": [
    "Unable to load result",
    "无法加载结果"
  ],
  "resultDetailPage.theResultCouldNotBeLoaded": [
    "The result could not be loaded.",
    "结果加载失败。"
  ],
  "resultDetailPage.resultFileIdContentType": [
    "Result file {id} · {content_type}",
    "结果文件 {id} · {content_type}"
  ],
  "resultDetailPage.characterizationAnalysisUnavailable": [
    "Characterization analysis unavailable",
    "表征分析不可用"
  ],
  "resultDetailPage.theCharacterizationAnalysisForThisResultIsNotAvailable": [
    "The characterization analysis for this result is not available in a readable form. Re-upload the result file or contact an instructor.",
    "该结果的表征分析无法以可读形式提供。请重新上传结果文件或联系导师。"
  ],
  "resultDetailPage.unsavedAnalysisPreview": [
    "Unsaved analysis preview",
    "未保存的分析预览"
  ],
  "resultDetailPage.statisticsAndFilteredFiguresPreviewYourExclusionSelection": [
    "Statistics and filtered figures preview your exclusion selection.",
    "统计和筛选图表正在预览当前排除选择。"
  ],
  "resultDetailPage.assignmentChangesTakeEffectAfterSaving": [
    "Assignment changes take effect after saving.",
    "关联变更将在保存后生效。"
  ],
  "resultDetailPage.assignmentChangesTakeEffectAfterSaving2": [
    " Assignment changes take effect after saving.",
    " 关联变更将在保存后生效。"
  ],
  "resultDetailPage.applyAssignmentChanges": [
    "Apply assignment changes",
    "应用关联变更"
  ],
  "resultDetailPage.saveManualExclusions": [
    "Save manual exclusions",
    "保存手动排除"
  ],
  "resultDetailPage.discardChanges": [
    "Discard changes",
    "放弃变更"
  ],
  "resultDetailPage.activeThresholdFilter": [
    "Active threshold filter",
    "当前阈值筛选"
  ],
  "resultDetailPage.currentAnalysisFilter": [
    "Current analysis filter",
    "当前分析筛选"
  ],
  "resultDetailPage.off": [
    "off",
    "关"
  ],
  "resultDetailPage.devicesMatchThresholdsAreNotSaved": [
    " devices match. Thresholds are not saved.",
    " 个器件符合条件。阈值不会保存。"
  ],
  "resultDetailPage.measurementQualityWarnings": [
    "Measurement quality warnings",
    "测量质量警告"
  ],
  "resultDetailPage.validTraces": [
    "Valid traces",
    "有效曲线"
  ],
  "resultDetailPage.bestForwardPCE": [
    "Best forward PCE (%)",
    "最佳正向 PCE (%)"
  ],
  "resultDetailPage.bestReversePCE": [
    "Best reverse PCE (%)",
    "最佳反向 PCE (%)"
  ],
  "resultDetailPage.resultSections": [
    "Result sections",
    "结果分区"
  ],
  "resultDetailPage.integrityProvenance": [
    "Integrity & provenance",
    "完整性与溯源"
  ],
  "resultDetailPage.size": [
    "Size",
    "大小"
  ],
  "resultDetailPage.analysisSchema": [
    "Analysis schema",
    "分析数据结构"
  ],
  "resultDetailPage.schemaV": [
    "Schema v",
    "数据结构版本 v"
  ],
  "resultDetailPage.uploadedBy": [
    "Uploaded by",
    "上传者"
  ],
  "resultDetailPage.notAvailable": [
    "Not available",
    "不可用"
  ],
  "resultDetailPage.substrateConditionAssignment": [
    "Substrate condition assignment",
    "基底条件关联"
  ],
  "resultDetailPage.groups": [
    " groups",
    " 组"
  ],
  "resultDetailPage.editAssignments": [
    "Edit assignments",
    "编辑关联"
  ],
  "resultDetailPage.selectExactlyOneExperimentConditionForEachSubstrateName": [
    "Select exactly one experiment condition for each substrate name read from the measurement file. Names do not set conditions automatically. If a name is not a physical laser mark, condition statistics and figures remain available, while physical device linkage stays unresolved.",
    "为测量文件中读取的每个基底名称恰好选择一个实验条件。名称不会自动设定条件。若名称不是物理激光标记，条件统计与图表仍可用，但物理器件关联保持未解析。"
  ],
  "resultDetailPage.allSubstratesMustBeAssignedBeforeStatisticsAreCalculated": [
    "All substrates must be assigned before statistics are calculated.",
    "统计计算前必须关联所有基底。"
  ],
  "resultDetailPage.assignmentsSavedFor": [
    "Assignments saved for ",
    "已保存条件关联： "
  ],
  "resultDetailPage.substrates": [
    " substrates.",
    " 片基底。"
  ],
  "resultDetailPage.deviceExclusions": [
    "Device exclusions ",
    "器件排除 "
  ],
  "resultDetailPage.deviceScanHistory": [
    "Device scan history ",
    "器件扫描历史 "
  ],
  "resultDetailPage.assignments": [
    " assignments",
    " 条关联"
  ],
  "resultDetailPage.savedAssignmentProvenance": [
    "Saved assignment provenance ",
    "已保存的条件关联溯源 "
  ],
  "resultDetailPage.rows": [
    " rows",
    " 行"
  ],
  "resultDetailPage.savedAssignmentProvenance2": [
    "Saved assignment provenance",
    "已保存的条件关联溯源"
  ],
  "resultDetailPage.parsedDevices2": [
    "Parsed devices ",
    "解析器件 "
  ],
  "resultDetailPage.publicationSubstrateUniformity": [
    "Publication substrate uniformity",
    "出版级基底均匀性"
  ],
  "resultDetailPage.metric": [
    "Metric ",
    "指标 "
  ],
  "resultDetailPage.scanDirection": [
    "Scan direction ",
    "扫描方向 "
  ],
  "resultDetailPage.colorBarMinimum": [
    "Color bar minimum ",
    "色条最小值 "
  ],
  "resultDetailPage.colorBarMaximum": [
    "Color bar maximum ",
    "色条最大值 "
  ],
  "resultDetailPage.problemThreshold": [
    "Problem threshold ",
    "问题阈值 "
  ],
  "resultDetailPage.applyColorRange": [
    "Apply color range",
    "应用颜色范围"
  ],
  "resultDetailPage.resetColorRange": [
    "Reset color range",
    "重置颜色范围"
  ],
  "resultDetailPage.valuesUseTheSelectedMetricSUnitBlankBounds": [
    "Values use the selected metric's unit. Blank bounds use the automatic range. The threshold marks the color scale midpoint; with RdYlGn, values below it are red/yellow and values above it are green. Both device scopes share the scale. For diverging red-blue, white marks the threshold when set; otherwise it marks the all-device median if within range, or the selected range midpoint. Color bar ticks and cell numbers show the measured metric.",
    "数值使用所选指标的单位。留空的边界使用自动范围。阈值标记色阶中点；使用 RdYlGn 时，低于阈值显示红/黄色，高于阈值显示绿色。两种器件范围共用同一色阶。对于发散红蓝配色，设置阈值时白色标记阈值；否则标记全器件中位数（若在范围内）或所选范围中点。色条刻度与单元格数字显示实测指标。"
  ],
  "resultDetailPage.publicationSubstrateUniformityForMetricDirectionScan": [
    "Publication substrate uniformity for {metric}, {direction} scan",
    "{metric} 的出版级基底均匀性，{direction} 扫描"
  ],
  "resultDetailPage.directionalGroupStatistics": [
    "Directional group statistics",
    "分方向分组统计"
  ],
  "resultDetailPage.oneRepresentativeScanPerDeviceAndDirectionBestAnd": [
    "One representative scan per device and direction. Best and mean are calculated separately for forward and reverse scans. Both scopes use the current exclusion selection.",
    "每个器件每个方向取一条代表性扫描。最佳值与均值分别按正向和反向扫描计算。两种范围均使用当前排除选择。"
  ],
  "resultDetailPage.bestMean": [
    "Best / mean",
    "最佳 / 均值"
  ],
  "resultDetailPage.afterExclusions": [
    "After exclusions",
    "排除后"
  ],
  "resultDetailPage.metricDistributions": [
    "Metric distributions",
    "指标分布"
  ],
  "resultDetailPage.forwardAndReverseScansAreSeparateFRBoth": [
    "Forward and reverse scans are separate (F/R). Both device scopes use the current exclusion selection.",
    "正向与反向扫描分开显示（F/R）。两种器件范围均使用当前排除选择。"
  ],
  "resultDetailPage.metricPublicationBoxPlotWithDevicePointsSplitBy": [
    "{metric} publication box plot with device points, split by scan direction",
    "{metric} 出版级箱线图（含器件点），按扫描方向分列"
  ],
  "resultsPage.loadingResults": [
    "Loading results…",
    "正在加载结果…"
  ],
  "resultsPage.unableToLoadResults": [
    "Unable to load results",
    "无法加载结果"
  ],
  "resultsPage.theResultsCouldNotBeLoaded": [
    "The results could not be loaded.",
    "结果加载失败。"
  ],
  "resultsPage.unableToRefreshResults": [
    "Unable to refresh results: ",
    "无法刷新结果： "
  ],
  "resultsPage.theDisplayedRowsMayNotMatchTheSelectedFilter": [
    "The displayed rows may not match the selected filter.",
    "显示的记录可能与当前筛选条件不一致。"
  ],
  "resultsPage.results": [
    "Results",
    "结果"
  ],
  "resultsPage.uploadedResultFilesAcrossAllCampaignsNewestFirst": [
    "Uploaded result files across all campaigns, newest first.",
    "跨所有实验系列的上传结果文件，最新在前。"
  ],
  "resultsPage.resultRecords": [
    "Result records",
    "结果记录"
  ],
  "resultsPage.experimentId": [
    "Experiment id",
    "实验 ID"
  ],
  "resultsPage.fabricationBatchId": [
    "Fabrication batch id",
    "制备批次 ID"
  ],
  "resultsPage.noCharacterizationResults": [
    "No characterization results.",
    "暂无表征结果。"
  ],
  "resultsPage.uploadedResultFilesAppearHereOnceAnInProgress": [
    "Uploaded result files appear here once an in-progress batch is characterized.",
    "对进行中的批次完成表征并上传后，结果文件将显示在此处。"
  ],
  "resultsPage.assigned": [
    "Assigned",
    "已关联"
  ],
  "uploadResultPage.uploadCharacterizationResult": [
    "Upload characterization result",
    "上传表征结果"
  ],
  "uploadResultPage.readDevicesFromAJVCSVAndContinueTo": [
    "Read devices from a JV CSV and continue to the assignment step.",
    "从 J-V CSV 读取器件并继续关联步骤。"
  ],
  "uploadResultPage.expectedGroups": [
    "Expected groups",
    "预期分组"
  ],
  "uploadResultPage.noEligibleFabricationBatches": [
    "No eligible fabrication batches.",
    "暂无符合条件的制备批次。"
  ],
  "uploadResultPage.startAFabricationBatchAndMarkItInProgress": [
    "Start a fabrication batch and mark it in progress before uploading results.",
    "请先开始制备批次并将其标记为进行中，再上传结果。"
  ],
  "uploadResultPage.resultFile": [
    "Result file",
    "结果文件"
  ],
  "uploadResultPage.fabricationBatch": [
    "Fabrication batch",
    "制备批次"
  ],
  "uploadResultPage.chooseTheBatchThatProducedTheseDevices": [
    "Choose the batch that produced these devices…",
    "请选择产出这些器件的批次…"
  ],
  "uploadResultPage.csvResultFile": [
    "CSV result file",
    "CSV 结果文件"
  ],
  "uploadResultPage.maximumSizeMBTheServerReValidatesSizeType": [
    "Maximum size 10 MB. The server re-validates size, type, and integrity.",
    "最大 10 MB。服务器将重新校验大小、类型与完整性。"
  ],
  "uploadResultPage.readingDevices": [
    "Reading devices…",
    "正在读取器件…"
  ],
  "uploadResultPage.readDevicesAndContinue": [
    "Read devices and continue",
    "读取器件并继续"
  ],
  "usersPage.loadingAccounts": [
    "Loading accounts…",
    "正在加载账户…"
  ],
  "usersPage.unableToLoadAccounts": [
    "Unable to load accounts.",
    "无法加载账户。"
  ],
  "usersPage.userAdministration": [
    "User administration",
    "用户管理"
  ],
  "usersPage.createLocalAccountsControlRoleBasedAccessAndReset": [
    "Create local accounts, control role-based access, and reset passwords.",
    "创建本地账户、控制基于角色的访问并重置密码。"
  ],
  "usersPage.createAccount": [
    "Create account",
    "创建账户"
  ],
  "usersPage.username": [
    "Username",
    "用户名"
  ],
  "usersPage.temporaryPassword": [
    "Temporary password",
    "临时密码"
  ],
  "usersPage.useAtLeastCharacters": [
    "Use at least 12 characters.",
    "至少使用 12 个字符。"
  ],
  "usersPage.accounts": [
    "Accounts",
    "账户"
  ],
  "usersPage.noAccountsAreAvailable": [
    "No accounts are available.",
    "暂无可用账户。"
  ],
  "usersPage.userAccounts": [
    "User accounts",
    "用户账户"
  ],
  "usersPage.user": [
    "User",
    "用户"
  ],
  "usersPage.state": [
    "State",
    "状态"
  ],
  "usersPage.access": [
    "Access",
    "权限"
  ],
  "usersPage.workflowAccess": [
    "Workflow access",
    "工艺区访问"
  ],
  "usersPage.loadingWorkflowAccess": ["Loading workflow access…", "正在读取工作流访问权…"],
  "usersPage.unableToLoadWorkflowAccess": ["Unable to read workflow access. Retry before changing permissions.", "无法读取工作流访问权，请重试后再修改授权。"],
  "usersPage.workflowAccessUnknown": ["Unknown", "状态未知"],
  "usersPage.workflowAccessLabel": [
    "Fabrication workflow",
    "制备工作流"
  ],
  "usersPage.workflowAccessForUsername": [
    "Fabrication workflow access for {username}",
    "{username} 的制备工作流访问权"
  ],
  "usersPage.workflowAccessUpdated": [
    "Workflow access updated.",
    "工作流访问权已更新。"
  ],
  "usersPage.workflowAccessFailed": [
    "Unable to update workflow access.",
    "无法更新工作流访问权。"
  ],
  "usersPage.passwordReset": [
    "Password reset",
    "密码重置"
  ],
  "usersPage.activity": [
    "Activity",
    "活动"
  ],
  "usersPage.roleFor": [
    "Role for ",
    "以下用户的角色： "
  ],
  "usersPage.roleForUsername": [
    "Role for {username}",
    "{username} 的角色"
  ],
  "usersPage.activeAccountForUsername": [
    "Active account for {username}",
    "{username} 的启用账户"
  ],
  "usersPage.saveAccessFor": [
    "Save access for ",
    "保存以下用户的权限： "
  ],
  "usersPage.newPasswordFor": [
    "New password for ",
    "以下用户的新密码： "
  ],
  "usersPage.newPasswordForUsername": [
    "New password for {username}",
    "{username} 的新密码"
  ],
  "usersPage.resetPasswordFor": [
    "Reset password for ",
    "重置以下用户的密码： "
  ],
  "usersPage.lastLogin": [
    "Last login",
    "上次登录"
  ],
  "usersPage.passwordChanged": [
    "Password changed",
    "密码修改时间"
  ],
  "usersPage.lockedUntil": [
    "Locked until",
    "锁定至"
  ],
  "workflowGuidePage.workflowGuide": [
    "Workflow guide",
    "流程指南"
  ],
  "workflowGuidePage.aShortPathFromAnExperimentPlanToJ": [
    "A short path from an experiment plan to J-V results and figures.",
    "从实验计划到 J-V 结果与图表的简要路径。"
  ],
  "workflowGuidePage.startAnExperiment": [
    "Start an experiment",
    "开始实验"
  ],
  "workflowGuidePage.beforeYouBegin": [
    "Before you begin",
    "开始之前"
  ],
  "workflowGuidePage.prepareTheExperimentContext": [
    "Prepare the experiment context",
    "准备实验环境"
  ],
  "workflowGuidePage.anActiveCampaignAndADeviceLayoutAreRequired": [
    "An active campaign and a device layout are required. Ask an instructor or administrator to prepare them if they are missing.",
    "需要一个进行中的实验系列和一个器件布局。如缺失，请导师或管理员准备。"
  ],
  "workflowGuidePage.viewDeviceLayouts": [
    "View device layouts",
    "查看器件布局"
  ],
  "workflowGuidePage.processMap": [
    "Process map",
    "流程图"
  ],
  "workflowGuidePage.theFullPathAtAGlance": [
    "The full path at a glance",
    "全流程一览"
  ],
  "workflowGuidePage.enlargeDiagram": [
    "Enlarge diagram",
    "放大流程图"
  ],
  "workflowGuidePage.archifyWorkflowCreateAndSubmitAnExperimentObtainInstructor": [
    "Archify workflow: create and submit an experiment, obtain instructor approval, release the plan, freeze and execute a fabrication batch, upload J-V data, then inspect curves or save assignments for group analysis.",
    "Archify 流程：创建并提交实验，经导师批准后发布计划，创建并执行制备批次，上传 J-V 数据，然后查看曲线或保存条件关联以进行分组分析。"
  ],
  "workflowGuidePage.staticOverviewUseTheLinkedStepsBelowToContinue": [
    "Static overview. Use the linked steps below to continue in the application.",
    "静态总览。请通过下方链接步骤在应用中继续操作。"
  ],
  "workflowGuidePage.workingSOP": [
    "Working SOP",
    "标准操作流程"
  ],
  "workflowGuidePage.followTheseSteps": [
    "Follow these steps",
    "按以下步骤操作"
  ],
  "workflowGuidePage.planStudent": [
    "Plan · student",
    "规划 · 学生"
  ],
  "workflowGuidePage.createAndSubmitAPlan": [
    "Create and submit a plan",
    "创建并提交计划"
  ],
  "workflowGuidePage.chooseTheCampaignAndDeviceLayoutDefineAControl": [
    "Choose the campaign and device layout, define a control and target conditions, then review and save the complete recipe. Open the draft experiment and select ",
    "选择实验系列和器件布局，设置对照和目标条件，检查并保存完整方案。打开实验草稿后选择 "
  ],
  "workflowGuidePage.createExperiment": [
    "Create experiment ",
    "创建实验 "
  ],
  "workflowGuidePage.reviewInstructorThenStudent": [
    "Review · instructor, then student",
    "审查 · 导师，然后学生"
  ],
  "workflowGuidePage.approveAndReleaseThePlan": [
    "Approve and release the plan",
    "批准并发布计划"
  ],
  "workflowGuidePage.anInstructorOrAdministratorReviewsTheConditionsAndSelects": [
    "An instructor or administrator reviews the conditions and selects ",
    "导师或管理员审核实验条件后选择 "
  ],
  "workflowGuidePage.theStudentThenOpensTheApprovedExperimentAndSelects": [
    ". The student then opens the approved experiment and selects ",
    "。然后学生打开已批准的实验并选择 "
  ],
  "workflowGuidePage.findTheExperiment": [
    "Find the experiment ",
    "查找实验 "
  ],
  "workflowGuidePage.fabricateStudent": [
    "Fabricate · student",
    "制备 · 学生"
  ],
  "workflowGuidePage.freezeABatchAndRecordTheWork": [
    "Freeze a batch and record the work",
    "创建制备批次并记录工作"
  ],
  "workflowGuidePage.onTheExperimentPageSelect": [
    "On the experiment page, select ",
    "在实验页面，选择 "
  ],
  "workflowGuidePage.before": [
    " before ",
    " 之后再选择 "
  ],
  "workflowGuidePage.inTheBatchRunSheetMarkItReadyStart": [
    ". In the batch run sheet, mark it ready, start execution, record actual preparations and processes, and complete the batch. Return to the experiment to complete fabrication when the work is finished.",
    "。在制备记录单中标记为就绪，开始执行，记录实际准备与工艺并完成批次。工作完成后返回实验页面完成制备。"
  ],
  "workflowGuidePage.characterizeStudent": [
    "Characterize · student",
    "表征 · 学生"
  ],
  "workflowGuidePage.uploadTheJVCSV": [
    "Upload the J-V CSV",
    "上传 J-V CSV"
  ],
  "workflowGuidePage.openTheExperimentAposS": [
    "Open the experiment's ",
    "打开实验的 "
  ],
  "workflowGuidePage.sectionAndSelect": [
    " section and select ",
    " 区域并选择 "
  ],
  "workflowGuidePage.chooseTheBatchThatProducedTheDevicesUploadIts": [
    ". Choose the batch that produced the devices, upload its CSV, and continue to the result. The batch must be in progress or completed.",
    "。选择产出器件的批次，上传 CSV 并查看结果。批次须处于进行中或已完成状态。"
  ],
  "workflowGuidePage.chooseAnExperiment": [
    "Choose an experiment ",
    "选择实验 "
  ],
  "workflowGuidePage.analyzeResultPage": [
    "Analyze · result page",
    "分析 · 结果页"
  ],
  "workflowGuidePage.inspectCurvesThenCompareGroups": [
    "Inspect curves, then compare groups",
    "查看曲线，再比较各组"
  ],
  "workflowGuidePage.jVCurvesAreAvailableImmediatelyAfterUploadAssign": [
    "J-V curves are available immediately after upload. Assign every substrate to its condition group and save assignments before group statistics and uniformity. Device exclusions are optional; review both all-device and filtered figures, with forward and reverse scans kept separate.",
    "上传后即可查看 J-V 曲线。在分组统计和均匀性分析前，将每片基底与对应条件组关联并保存关联。器件排除为可选；请同时查看全器件与筛选后的图表，正向与反向扫描分开呈现。"
  ]
} as const;
