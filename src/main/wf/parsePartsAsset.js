

const parsePartsAsset = (rawParts) => {
  const {
    i: images,
    g: graphics,
    a: imageMaxNumbers,
    o: movieMaxNumbers,
    t: matrices,
  } = rawParts;
}

const parseGraphics = (rawGraphics) => {
  const {
    s: segments,
    t: totalFrames,
  } = rawGraphics[0];
}

const parseGraphicSegment = (rawSegment) => {
  const {
    s: segmentType,
  };

  switch (segmentType) {
    case 0: {
      return 'Image';
    }
    case 1: {
      return 'Movie';
    }
    case 2: {
      return 'Graphic';
    }
    default: {
      return null;
    }
  }
}

const parseMatrix = (matrix) => {
  const {a, b, c, d, x, y} = matrix;
  return { a: a/4096, b: b/4096, c: c/4096, d: d/4096, x: x/4096, y: y/4096};
}