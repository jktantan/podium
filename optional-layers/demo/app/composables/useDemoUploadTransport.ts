import type { UploadSuccessResult, UploadTransport } from 'vue-flow-upload'

/**
 * demo 专用的内存上传传输。
 *
 * 不请求后端：按文件大小分 12 步模拟进度，完成后用 object URL 提供预览；
 * 删除文件时同步释放对应的 object URL，页面卸载时释放全部。
 * 真实项目应使用 createHttpUploadTransport 或自己的请求封装。
 */
export function useDemoUploadTransport() {
  const objectUrls = new Map<string, string>()
  let sequence = 0

  const transport: UploadTransport = {
    uploadFile({ file }, context) {
      const fileId = `demo-file-${++sequence}`
      const url = URL.createObjectURL(file)
      const total = Math.max(file.size, 1)
      const step = Math.max(Math.ceil(total / 12), 1)

      return new Promise<UploadSuccessResult>((resolve, reject) => {
        let loaded = 0

        const cleanup = () => {
          window.clearInterval(timer)
          context.signal.removeEventListener('abort', handleAbort)
        }

        const handleAbort = () => {
          cleanup()
          URL.revokeObjectURL(url)
          reject(new DOMException('Upload aborted', 'AbortError'))
        }

        const timer = window.setInterval(() => {
          loaded = Math.min(loaded + step, total)
          context.onProgress(loaded, total)

          if (loaded < total) {
            return
          }

          cleanup()
          objectUrls.set(fileId, url)
          resolve({
            fileId,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            url,
            status: 'success'
          })
        }, 120)

        if (context.signal.aborted) {
          handleAbort()
          return
        }

        context.signal.addEventListener('abort', handleAbort)
      })
    },

    async deleteFile(fileId) {
      const url = objectUrls.get(fileId)

      if (url) {
        URL.revokeObjectURL(url)
        objectUrls.delete(fileId)
      }
    }
  }

  onBeforeUnmount(() => {
    objectUrls.forEach((url) => URL.revokeObjectURL(url))
    objectUrls.clear()
  })

  return transport
}
