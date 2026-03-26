const scratch = new Map();
const tintCache = new Map();
const measureCanvas = document.createElement('canvas');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createRng = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const getScratchCanvas = (key, width, height) => {
  let canvas = scratch.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    scratch.set(key, canvas);
  }
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  return canvas;
};

const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (hex) => {
  const safe = hex.replace('#', '');
  const value = safe.length === 3 ? safe.split('').map((part) => part + part).join('') : safe;
  const parsed = Number.parseInt(value, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
};

const getProcessedAsset = (image, settings, color) => {
  const key = [
    image.src || image.width,
    color,
    settings.preserveColor,
    settings.removeWhite,
    settings.whiteThreshold,
    image.width,
    image.height,
  ].join(':');

  const cached = tintCache.get(key);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  if (settings.removeWhite) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const threshold = settings.whiteThreshold ?? 235;
    for (let index = 0; index < imageData.data.length; index += 4) {
      const r = imageData.data[index];
      const g = imageData.data[index + 1];
      const b = imageData.data[index + 2];
      const avg = (r + g + b) / 3;
      if (avg >= threshold) {
        imageData.data[index + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  if (!settings.preserveColor) {
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  tintCache.set(key, canvas);
  return canvas;
};

const getTextFont = (text, scale = 1) => {
  const style = text.italic ? 'italic ' : '';
  return `${style}${text.weight} ${Math.round(text.size * scale)}px "${text.font}", sans-serif`;
};

const layoutText = (ctx, text, maxWidth, scale = 1) => {
  const output = [];
  const fontSize = text.size * scale;
  const paragraphs = String(text.value ?? '').split('\n');
  ctx.font = getTextFont(text, scale);

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const source = text.uppercase ? paragraph.toUpperCase() : paragraph;
    if (!source.trim()) {
      output.push('');
      return;
    }

    const words = source.split(/\s+/);
    let line = '';
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      const candidateWidth = ctx.measureText(candidate).width + Math.max(0, candidate.length - 1) * (text.tracking * scale);
      if (candidateWidth > maxWidth && line) {
        output.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) {
      output.push(line);
    }
  });

  return {
    lines: output,
    lineHeight: fontSize * text.leading,
  };
};

const getTextLeft = (align, x, width) => {
  if (align === 'center') {
    return x - width / 2;
  }
  if (align === 'right') {
    return x - width;
  }
  return x;
};

const shouldJustifyLine = (align, line, index, lines) => (
  align === 'justify' &&
  line.trim().includes(' ') &&
  index < lines.length - 1 &&
  lines[index + 1] !== ''
);

const drawJustifiedLine = (ctx, line, y, maxWidth, tracking) => {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    ctx.fillText(line, 0, y);
    return;
  }

  const wordWidths = words.map((word) => ctx.measureText(word).width + Math.max(0, word.length - 1) * tracking);
  const totalWordsWidth = wordWidths.reduce((sum, width) => sum + width, 0);
  const gap = (maxWidth - totalWordsWidth) / (words.length - 1);

  let cursorX = 0;
  words.forEach((word, index) => {
    ctx.fillText(word, cursorX, y);
    cursorX += wordWidths[index] + gap;
  });
};

const drawTextLayer = (ctx, layer, width, height) => {
  const text = layer.text;
  const maxWidth = width * text.width;
  const anchorX = layer.transform.x * width;
  const anchorY = layer.transform.y * height;
  const { lines, lineHeight } = layoutText(ctx, text, maxWidth);

  ctx.save();
  ctx.translate(anchorX, anchorY);
  ctx.rotate((layer.transform.rotation * Math.PI) / 180);
  ctx.fillStyle = text.color;
  ctx.font = getTextFont(text);
  ctx.textBaseline = 'top';
  ctx.textAlign = text.align === 'justify' ? 'left' : text.align;
  ctx.letterSpacing = `${text.tracking}px`;

  lines.forEach((line, index) => {
    const y = index * lineHeight;
    if (shouldJustifyLine(text.align, line, index, lines)) {
      drawJustifiedLine(ctx, line, y, maxWidth, text.tracking);
    } else {
      ctx.fillText(line, 0, y);
    }
  });
  ctx.restore();
};

const drawPixelShape = (ctx, layer, width, height, getImage) => {
  const minDim = Math.min(width, height);
  const drawSize = minDim * layer.shape.size * layer.transform.scale;
  const resolution = clamp(Math.round(layer.shape.pixelSize), 12, 84);
  const scratchCanvas = getScratchCanvas(
    `shape:${layer.id}:${layer.shape.seed}:${resolution}:${layer.shape.points}:${layer.shape.bites}`,
    resolution,
    resolution,
  );
  const sctx = scratchCanvas.getContext('2d');
  const rng = createRng(layer.shape.seed);
  const center = resolution / 2;

  sctx.save();
  sctx.translate(center, center);
  sctx.scale(layer.shape.squishX, layer.shape.squishY);
  sctx.fillStyle = layer.shape.fill;
  sctx.beginPath();

  for (let step = 0; step < layer.shape.points; step += 1) {
    const angle = (step / layer.shape.points) * Math.PI * 2;
    const radiusFactor =
      0.72 +
      (rng() - 0.5) * layer.shape.roughness +
      Math.sin(angle * 2 + layer.shape.seed * 0.011) * layer.shape.asymmetry +
      Math.sin(angle * 5 + layer.shape.seed * 0.007) * layer.shape.wobble;
    const radius = center * clamp(radiusFactor, 0.35, 1);
    const x = Math.round(Math.cos(angle) * radius);
    const y = Math.round(Math.sin(angle) * radius);
    if (step === 0) {
      sctx.moveTo(x, y);
    } else {
      sctx.lineTo(x, y);
    }
  }

  sctx.closePath();
  sctx.fill();
  sctx.restore();

  if (layer.shape.bites > 0) {
    sctx.save();
    sctx.globalCompositeOperation = 'destination-out';
    for (let index = 0; index < layer.shape.bites; index += 1) {
      const angle = rng() * Math.PI * 2;
      const distance = center * (0.7 + rng() * 0.3);
      const biteRadius = center * clamp(layer.shape.biteSize * (0.85 + rng() * 0.45), 0.03, 0.28);
      sctx.beginPath();
      sctx.arc(
        center + Math.cos(angle) * distance,
        center + Math.sin(angle) * distance,
        biteRadius,
        0,
        Math.PI * 2,
      );
      sctx.fill();
    }
    sctx.restore();
  }

  const shapeImage = layer.shape.imageSrc ? getImage(layer.shape.imageSrc) : null;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(layer.transform.x * width, layer.transform.y * height);
  ctx.rotate((layer.transform.rotation * Math.PI) / 180);
  ctx.drawImage(scratchCanvas, -drawSize / 2, -drawSize / 2, drawSize, drawSize);

  if (shapeImage) {
    const contentSize = clamp(Math.round(resolution * 8), 192, 1024);
    const contentCanvas = getScratchCanvas(`shape-image:${layer.id}:${contentSize}`, contentSize, contentSize);
    const cctx = contentCanvas.getContext('2d');
    const fitScale = Math.max(contentSize / shapeImage.width, contentSize / shapeImage.height) * (layer.shape.imageScale ?? 1);
    const drawWidth = shapeImage.width * fitScale;
    const drawHeight = shapeImage.height * fitScale;

    cctx.save();
    cctx.drawImage(shapeImage, (contentSize - drawWidth) / 2, (contentSize - drawHeight) / 2, drawWidth, drawHeight);
    cctx.globalCompositeOperation = 'destination-in';
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(scratchCanvas, 0, 0, contentSize, contentSize);
    cctx.restore();

    ctx.globalAlpha = layer.shape.imageOpacity ?? 1;
    ctx.globalCompositeOperation = layer.shape.imageBlendMode ?? 'source-over';
    ctx.drawImage(contentCanvas, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
  }

  ctx.restore();
};

const drawAssetLayer = (ctx, layer, width, height, image, settings) => {
  if (!image) {
    return;
  }

  const minDim = Math.min(width, height);
  const renderTarget = getProcessedAsset(image, settings, settings.tint);
  const aspect = renderTarget.width / renderTarget.height || 1;
  const drawWidth = minDim * settings.size * layer.transform.scale;
  const drawHeight = drawWidth / aspect;
  const x = layer.transform.x * width;
  const y = layer.transform.y * height;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((layer.transform.rotation * Math.PI) / 180);

  if (settings.radius > 0) {
    const radius = Math.min(drawWidth, drawHeight) * settings.radius;
    ctx.beginPath();
    ctx.roundRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, radius);
    ctx.clip();
  }

  ctx.drawImage(renderTarget, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
};

const drawBackground = (ctx, width, height, background, getImage) => {
  if (background.mode === 'gradient') {
    const rad = (background.angle * Math.PI) / 180;
    const gradient = ctx.createLinearGradient(
      width / 2 - Math.cos(rad) * width * 0.5,
      height / 2 - Math.sin(rad) * height * 0.5,
      width / 2 + Math.cos(rad) * width * 0.5,
      height / 2 + Math.sin(rad) * height * 0.5,
    );
    gradient.addColorStop(0, background.colorA);
    gradient.addColorStop(1, background.colorB);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (background.mode === 'image' && background.imageSrc) {
    const image = getImage(background.imageSrc);
    if (image) {
      const scale = Math.max(width / image.width, height / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      return;
    }
  }

  ctx.fillStyle = background.colorA;
  ctx.fillRect(0, 0, width, height);
};

export const measureLayerBounds = ({ layer, width, height, getImage }) => {
  if (!layer?.visible) {
    return null;
  }

  if (layer.kind === 'shape') {
    const minDim = Math.min(width, height);
    const drawSize = minDim * layer.shape.size * layer.transform.scale;
    return {
      x: layer.transform.x * width - drawSize / 2,
      y: layer.transform.y * height - drawSize / 2,
      width: drawSize,
      height: drawSize,
    };
  }

  if (layer.kind === 'logo' || layer.kind === 'image') {
    const image = getImage(layer.assetSrc);
    const minDim = Math.min(width, height);
    const settings = layer.kind === 'logo' ? layer.logo : layer.image;
    const aspect = image ? image.width / image.height || 1 : layer.kind === 'logo' ? 2.8 : 1;
    const drawWidth = minDim * settings.size * layer.transform.scale;
    const drawHeight = drawWidth / aspect;
    return {
      x: layer.transform.x * width - drawWidth / 2,
      y: layer.transform.y * height - drawHeight / 2,
      width: drawWidth,
      height: drawHeight,
    };
  }

  if (layer.kind === 'text') {
    const ctx = measureCanvas.getContext('2d');
    const maxWidth = width * layer.text.width;
    const { lines, lineHeight } = layoutText(ctx, layer.text, maxWidth);
    ctx.font = getTextFont(layer.text);
    const longestLine = lines.reduce((max, line, index) => {
      if (shouldJustifyLine(layer.text.align, line, index, lines)) {
        return Math.max(max, maxWidth);
      }
      const candidate = ctx.measureText(line).width + Math.max(0, line.length - 1) * layer.text.tracking;
      return Math.max(max, candidate);
    }, 0);
    const blockHeight = Math.max(1, lines.length) * lineHeight;
    const left = getTextLeft(layer.text.align, layer.transform.x * width, longestLine);
    return {
      x: left,
      y: layer.transform.y * height,
      width: Math.max(1, longestLine),
      height: blockHeight,
    };
  }

  return null;
};

export const renderScene = ({ ctx, width, height, scene, getImage }) => {
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height, scene.background, getImage);

  scene.layers.forEach((layer) => {
    if (!layer.visible) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.filter = layer.blur > 0 ? `blur(${layer.blur}px)` : 'none';

    if (layer.kind === 'shape') {
      drawPixelShape(ctx, layer, width, height, getImage);
    } else if (layer.kind === 'text') {
      drawTextLayer(ctx, layer, width, height);
    } else if (layer.kind === 'logo') {
      const image = getImage(layer.assetSrc);
      if (image) {
        drawAssetLayer(ctx, layer, width, height, image, layer.logo);
      }
    } else if (layer.kind === 'image') {
      const image = getImage(layer.assetSrc);
      if (image) {
        drawAssetLayer(ctx, layer, width, height, image, layer.image);
      }
    }

    ctx.restore();
  });
};
