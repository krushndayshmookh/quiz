import { ref } from 'vue'
import type { Socket } from 'socket.io-client'

// Singleton — survives page navigation
let socket: Socket | null = null
let connecting: Promise<Socket> | null = null
const socketRef = ref<Socket | null>(null)

export function useSocket() {
  async function connect(): Promise<Socket> {
    // Already connected
    if (socket?.connected) return socket

    // Connection in progress
    if (connecting) return connecting

    connecting = new Promise<Socket>(async (resolve) => {
      const { io } = await import('socket.io-client')

      // If socket exists but disconnected, just reconnect
      if (socket) {
        socket.connect()
        socketRef.value = socket
        connecting = null
        resolve(socket)
        return
      }

      socket = io('/', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      })
      socketRef.value = socket

      socket.on('connect', () => {
        console.log('[client] socket connected:', socket!.id)
        connecting = null
        resolve(socket!)
      })

      // If already connected synchronously
      if (socket.connected) {
        connecting = null
        resolve(socket)
      }
    })

    return connecting
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
    socketRef.value = null
    connecting = null
  }

  function on(event: string, handler: (...args: any[]) => void) {
    socket?.on(event, handler)
  }

  function off(event: string, handler?: (...args: any[]) => void) {
    if (handler) {
      socket?.off(event, handler)
    } else {
      socket?.removeAllListeners(event)
    }
  }

  function emit(event: string, data?: unknown) {
    socket?.emit(event, data)
  }

  return { socket: socketRef, connect, disconnect, on, off, emit }
}
