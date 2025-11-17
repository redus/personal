const canvas = document.querySelector("canvas");

// Your WebGPU code will begin here!
if (!navigator.gpu) {
  throw new Error("WebGPU not supported on this browser, use WEBGL!");
}

const adapter = await navigator.gpu.requestAdapter();

if (!adapter) {
  throw new Error("No appropriate GPUAdapter found.");
}
const device = await adapter.requestDevice();

// configure context
const context = canvas.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device: device,
  format: canvasFormat,
});

// vertices
const vertices = new Float32Array([
  -0.8, -0.8,
   0.8, -0.8,
   0.8,  0.8,

  -0.8, -0.8,
   0.8,  0.8,
  -0.8,  0.8,
]);
const vertexBuffer = device.createBuffer({
  label: "Cell vertices",
  size: vertices.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});

// layout
const vertexBufferLayout = {
  arrayStride: 8,
  attributes: [{
    format: "float32x2",
    offset: 0,
    shaderLocation: 0, // Position, see vertex shader
  }],
};

device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/0, vertices);
// shader
const cellShaderModule = device.createShaderModule({
  label: "Cell shader",
  code: `
    @vertex
    fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
      return vec4f(pos, 0, 1);
    }

    @fragment
    fn fragmentMain() -> @location(0) vec4f {
      return vec4f(1, 0, 0, 1);
    }
  `
});

// pipeline
const cellPipeline = device.createRenderPipeline({
  label: "Cell pipeline",
  layout: "auto",
  vertex: {
    module: cellShaderModule,
    entryPoint: "vertexMain",
    buffers: [vertexBufferLayout]
  },
  fragment: {
    module: cellShaderModule,
    entryPoint: "fragmentMain",
    targets: [{
      format: canvasFormat
    }]
  }
});

// encoder
const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass({
  colorAttachments: [{
    view: context.getCurrentTexture().createView(),
    loadOp: "clear",
    clearValue: { r: 0, g: 0, b: 0.4, a: 1 },
    storeOp: "store",
  }]
});

pass.setPipeline(cellPipeline);
pass.setVertexBuffer(0, vertexBuffer);
pass.draw(vertices.length / 2);

pass.end();

// issue

device.queue.submit([encoder.finish()]);
