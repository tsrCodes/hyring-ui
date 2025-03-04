import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";
import Toastify from "toastify-js";
import "./style.css";

// new user should see the canvas as it is , if dont want change it to false
let canvasForNewUser = true;

// latency
// let lastEmit = Date.now();
// const throttleTime = 25;

// Only One tab Allow

// const channel = new BroadcastChannel("activeTab");
// let isMainTab = true;
// channel.postMessage("check");
// channel.onmessage = (event) => {
//   if (event.data === "check") {
//     channel.postMessage("already_open");
//   }

//   if (event.data === "already_open") {
//     isMainTab = false;
//     alert("This app is already open in another tab!");
//     window.location.href = "about:blank";
//   }
// };

// window.addEventListener("beforeunload", () => {
//   channel.close();
// });

let name = localStorage.getItem("name");
function getAndSetName() {
  name = prompt("Enter Your Name");
  if (name) {
    localStorage.setItem("name", name);
    document.body.classList.remove("hidden");
  } else {
    alert("Name is required!");
    getAndSetName();
  }
}
if (!name) {
  getAndSetName();
} else {
  document.body.classList.remove("hidden");
}

const socket = io(import.meta.env.VITE_SERVER, {
  query: { name, canvasForNewUser },
});

const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
const colorPicker = document.getElementById("colorPicker");
const brushSizeInput = document.getElementById("brushSize");
const clearCanvas = document.getElementById("clearCanvas");
const resetToDefault = document.getElementById("resetToDefault");

canvas.width = window.innerWidth * 0.9;
canvas.height = window.innerHeight * 0.7;

let canDraw = false;
let previousPosition;
let brushColor = "#0f3443";
let brushSize = 5;

colorPicker.addEventListener("input", (e) => (brushColor = e.target.value));
brushSizeInput.addEventListener("input", (e) => (brushSize = e.target.value));
resetToDefault.addEventListener("click", (e) => {
  brushColor = "#0f3443";
  brushSize = 5;
  colorPicker.value = brushColor;
  brushSizeInput.value = brushSize;
});

function startDrawing(e) {
  e.preventDefault();
  canDraw = true;
  previousPosition = getCanvasCoords(e);
  ctx.beginPath();
  ctx.moveTo(previousPosition.x, previousPosition.y);
  socket.emit("startDrawing", previousPosition);
}

function stopDrawing() {
  canDraw = false;
  ctx.beginPath();
}

function drawing(e) {
  if (!canDraw) return;

  // latency
  // if (Date.now() - lastEmit < throttleTime) return;

  const currentPosition = getCanvasCoords(e);
  const data = {
    from: previousPosition,
    to: currentPosition,
    color: brushColor,
    size: brushSize,
  };

  drawLine(data.from, data.to, data.color, data.size);
  socket.emit("drawing", data);

  previousPosition = currentPosition;
}

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", drawing);
canvas.addEventListener("mouseup", stopDrawing);

canvas.addEventListener("touchstart", startDrawing);
canvas.addEventListener("touchmove", drawing);
canvas.addEventListener("touchend", stopDrawing);

clearCanvas.addEventListener("click", () => {
  clearTheCanvas();
  socket.emit("clear");
});

function clearTheCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  }
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function drawLine(from, to, color, size) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

socket.on("startDrawing", (data) => {
  ctx.beginPath();
  ctx.moveTo(data.x, data.y);
});

socket.on("notify", (data) => {
  Toastify({
    text: data,
    duration: 5000,
    gravity: "top",
    position: "right",
    stopOnFocus: true,
    style: {
      background: "#0f3443",
    },
  }).showToast();
});
socket.on("drawing", (data) => {
  drawLine(data.from, data.to, data.color, data.size);
});

socket.on("clear", () => {
  clearTheCanvas();
});

if (canvasForNewUser) {
  socket.on("canvas", (canvasData) => {
    canvasData.forEach((data) =>
      drawLine(data.from, data.to, data.color, data.size)
    );
  });
}

socket.on("count", (count) => {
  document.getElementById("connectionsCount").innerText = count;
});
