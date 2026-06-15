const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.static('public'))

const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// Room management
const rooms = new Map()

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('join-room', (roomId) => {
    socket.join(roomId)
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { clients: new Set() })
    }
    rooms.get(roomId).clients.add(socket.id)
    console.log(`Socket ${socket.id} joined room ${roomId}`)
  })

  socket.on('signal', ({ roomId, data }) => {
    socket.to(roomId).emit('signal', data)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
    // Clean up rooms
    for (const [roomId, room] of rooms.entries()) {
      room.clients.delete(socket.id)
      if (room.clients.size === 0) {
        rooms.delete(roomId)
      }
    }
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`)
})