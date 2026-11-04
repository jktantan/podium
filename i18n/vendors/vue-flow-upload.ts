import type { AppLocale } from '../config'

/**
 * vue-flow-upload 语言包。
 *
 * 库内置 zh-CN / en-US / ru-RU，没有繁体；繁体文案在 EXTRA_MESSAGES 里按库的
 * messages 结构补齐，由 app/plugins/vue-flow-upload.client.ts 创建 i18n 实例时
 * 与内置语言包合并。键名必须与库内置语言包一致（VueFlowUpload.*）。
 */
export const FLOW_UPLOAD_LOCALES: Record<AppLocale, string> = {
  'zh-CN': 'zh-CN',
  en: 'en-US',
  'zh-TW': 'zh-TW'
}

/** 只有库缺失的语言需要在这里补；内置语言直接使用库自带文案 */
const EXTRA_MESSAGES: Partial<Record<AppLocale, Record<string, unknown>>> = {
  'zh-TW': {
    VueFlowUpload: {
      selectFile: '選擇檔案或拖曳到這裡',
      chooseFile: '選擇檔案',
      uploadLimits: '支援：{accept}；單一檔案不超過 {maxSize}',
      allFileTypes: '所有檔案類型',
      unlimited: '不限',
      dragHint: '支援一般上傳；可設定檔案類型、大小與業務參數。',
      dragUpload: '可拖曳上傳檔案',
      dropToUpload: '放開即可上傳',
      startUpload: '開始上傳',
      pause: '暫停',
      resume: '繼續',
      retry: '重試',
      remove: '移除',
      preview: '預覽',
      download: '下載',
      downloadSelected: '下載已選',
      downloadAll: '下載全部',
      closePreview: '關閉預覽',
      uploadFailed: '上傳失敗',
      waiting: '等待上傳',
      validating: '正在驗證',
      hashing: '正在計算 SHA-256',
      checking: '正在檢查秒傳',
      uploading: '正在上傳',
      loading: '載入中…',
      processing: '處理中',
      paused: '已暫停',
      completed: '已完成',
      canceled: '已取消',
      rejected: '已拒絕',
      fileTooLarge: '「{name}」超過允許的檔案大小',
      fileTypeNotAllowed: '「{name}」不是允許的檔案類型',
      beforeUploadRejected: '「{name}」被上傳前驗證拒絕',
      pendingFiles: '{count} 個檔案等待上傳',
      selectAll: '全選',
      fileActions: '檔案操作',
      selectedFiles: '已選 {count} 項',
      removeSelected: '刪除',
      fileCount: '共 {count} 個檔案',
      removeConfirmTitle: '確認刪除檔案？',
      removeSingleConfirmMessage:
        '刪除檔案「{name}」後，將同時清理伺服器中的上傳資料，且無法復原。',
      removeMultipleConfirmMessage:
        '刪除 {count} 個檔案後，將同時清理伺服器中的上傳資料，且無法復原。',
      removeConfirmProcessing: '正在刪除…',
      cancel: '取消',
      removeCleanupFailed: '伺服器清理失敗，請重試。',
      uploadingToast: '正在上傳',
      noUploadFilesToast: '請選擇需要上傳的檔案',
      noDownloadFilesToast: '請選擇需要下載的檔案',
      noRemoveFilesToast: '請選擇需要刪除的檔案',
      uploadFile: '上傳檔案',
      noData: '暫無資料',
      avatar: '頭像',
      avatarCropTitle: '裁切頭像',
      avatarInvalidType: '請選擇符合格式要求的頭像圖片',
      avatarTooLarge: '頭像圖片超過允許大小',
      avatarSelectFirst: '請先選擇頭像圖片',
      avatarNotReady: '頭像圖片尚未準備完成',
      avatarUploadFailed: '頭像上傳失敗',
      avatarUploadFailedWithStatus: '頭像上傳失敗（{status}）',
      avatarTransportNotConfigured: '未設定頭像上傳位址或傳輸方法',
      avatarDeleteFailed: '刪除頭像失敗',
      avatarPreview: '檢視',
      avatarUpdate: '更新',
      avatarDragHint: '可拖曳頭像圖片',
      avatarDropToUpload: '放開滑鼠以上傳頭像',
      avatarChoose: '選擇頭像',
      avatarUpload: '上傳',
      avatarUploading: '正在上傳…',
      paginationTotal: '共 {total} 項',
      paginationItemsPerPage: '{size} / 頁',
      paginationPrevious: '上一頁',
      paginationNext: '下一頁',
      paginationPageNumber: '頁碼',
      paginationGoTo: '跳轉至',
      paginationLabel: '分頁導覽'
    }
  }
}

export function getFlowUploadExtraMessages() {
  return EXTRA_MESSAGES
}
