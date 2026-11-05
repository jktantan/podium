/** 拖拽验证码的三种消息状态，由父组件通过 `status` 传入。 */
export type DropDownCaptchaStatus = 'default' | 'success' | 'error'

/** 消息区文案，可按状态覆盖内置中文。 */
export interface DropDownCaptchaMessages {
  default: string
  success: string
  error: string
}

/**
 * 拼图块左上角在底图显示坐标系中的位置。
 *
 * 坐标以底图左上角为原点，单位为渲染后的像素；拼图块部分超出底图时
 * 坐标可能为负数，由父组件决定如何比对。
 */
export interface DropDownCaptchaVerifyPayload {
  x: number
  y: number
}
