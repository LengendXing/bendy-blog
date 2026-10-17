/**
 * 输入法组合态判断。
 * 组合态下按 Enter 是确认候选词，不应触发新建 / 重命名等提交动作。
 */
export interface ImeKeyboardEventLike {
  nativeEvent?: { isComposing?: boolean }
  isComposing?: boolean
  keyCode?: number
}

export function isImeComposing(event: ImeKeyboardEventLike): boolean {
  return event.nativeEvent?.isComposing === true || event.isComposing === true || event.keyCode === 229
}
