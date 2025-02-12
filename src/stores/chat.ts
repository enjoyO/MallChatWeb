import { ref, reactive, watch } from 'vue'
import { defineStore } from 'pinia'
import apis from '@/services/apis'
import type { MessageItemType } from '@/services/types'
import { computedTimeBlock } from '@/utils/computedTime'
import shakeTitle from '@/utils/shakeTitle'

export const pageSize = 20

export const useChatStore = defineStore('chat', () => {
  // 消息列表滚动到底部事件
  const chatListToBottomAction = ref<() => void>()

  // 消息列表
  const chatMessageList = ref<MessageItemType[]>([])
  const isLast = ref(false)
  const loading = ref(true)
  const cursor = ref()

  // 离最新消息是否滚动超过一屏
  const isScrollAboveOneScreen = ref(false)

  // 新消息计数
  const newMsgCount = ref(0)

  // 当前消息回复
  const currentMsgReply = reactive<Partial<MessageItemType>>({})

  const getMsgList = async () => {
    const data = await apis.getMsgList({ params: { pageSize, cursor: cursor.value, roomId: 1 } }).send()
    if (!data) return
    chatMessageList.value = [...computedTimeBlock(data.list), ...chatMessageList.value]
    cursor.value = data.cursor
    isLast.value = data.isLast
    loading.value = false
  }

  // 默认执行一次
  getMsgList()

  const pushMsg = (msg: MessageItemType) => {
    chatMessageList.value.push(
      ...computedTimeBlock([chatMessageList.value[chatMessageList.value.length - 1], msg], false),
    )

    // tab 在后台获得新消息，就开始闪烁！
    if (document.hidden && !shakeTitle.isShaking) {
      shakeTitle.start()
    }

    if (isScrollAboveOneScreen.value) {
      newMsgCount.value++
      return
    }

    // 聊天列表滚动到底部
    setTimeout(() => {
      // 如果超过一屏了，不自动滚动到最新消息。
      chatListToBottomAction.value?.()
    }, 0)
  }

  // 过滤掉小黑子的发言
  const filterUser = (uid: number) => {
    if (typeof uid !== 'number') return
    chatMessageList.value = chatMessageList.value.filter((item) => item.fromUser.uid !== uid)
  }

  const loadMore = async () => {
    if (isLast.value) return
    await getMsgList()
  }

  // 如果滚动超过一屏了，来了新消息要计数标识，滚动到一屏内的时候，清空计数
  watch(isScrollAboveOneScreen, (val) => {
    if (!val) {
      newMsgCount.value = 0
    }
  })

  return {
    chatMessageList,
    pushMsg,
    chatListToBottomAction,
    isScrollAboveOneScreen,
    newMsgCount,
    loading,
    isLast,
    loadMore,
    currentMsgReply,
    filterUser,
  }
})
