// texture.frag
#define M_PI 3.1415926535897932384626433832795
#define M_TAU M_PI / 2.0
precision mediump float;

varying vec2 v_texCoord;
varying vec2 v_position;

uniform sampler2D u_image;
uniform sampler2D u_effect;
uniform sampler2D u_tiles;
uniform sampler2D u_tileMapping;

uniform vec2 u_size;
uniform vec2 u_tileSize;
uniform vec2 u_mapTextureSize;

uniform vec4 u_color;
uniform vec4 u_region;
uniform vec2 u_parallax;
uniform float u_time;

uniform int u_renderMap;
uniform int u_renderParallax;
uniform int u_renderMode;

float masked = 0.0;
float sorted = 1.0;
float displace = 1.0;
float blur = 1.0;

vec2 rippleX(vec2 texCoord, float a, float b, float c) {
  vec2 rippled = vec2(
    v_texCoord.x + sin(v_texCoord.y * (a * u_size.y) + b) * c / u_size.x,
    v_texCoord.y
  );

  if (rippled.x < 0.0) {
    rippled.x = abs(rippled.x);
  }
  else if (rippled.x > u_size.x) {
    rippled.x = u_size.x - (rippled.x - u_size.x);
  }

  return rippled;
}

vec2 rippleY(vec2 texCoord, float a, float b, float c) {
  vec2 rippled = vec2(v_texCoord.x, v_texCoord.y + sin(v_texCoord.x * (a * u_size.x) + b) * c / u_size.y);

  if (rippled.y < 0.0) {
    rippled.x = abs(rippled.x);
  }
  else if (rippled.y > u_size.y) {
    rippled.y = u_size.y - (rippled.y - u_size.y);
  }

  return rippled;
}

vec4 motionBlur(sampler2D image, float angle, float magnitude, vec2 textCoord) {
  vec4 originalColor = texture2D(image, textCoord);
  vec4 dispColor = originalColor;

  const float max = 10.0;
  float weight = 0.85;

  for (float i = 0.0; i < max; i += 1.0) {
    if(i > abs(magnitude) || originalColor.a < 1.0) {
      break;
    }
    vec4 dispColorDown = texture2D(image, textCoord + vec2(
      cos(angle) * i * sign(magnitude) / u_size.x,
      sin(angle) * i * sign(magnitude) / u_size.y
    ));
    dispColor = dispColor * (1.0 - weight) + dispColorDown * weight;
    weight *= 0.8;
  }

  return dispColor;
}

vec4 linearBlur(sampler2D image, float angle, float magnitude, vec2 textCoord) {
  vec4 originalColor = texture2D(image, textCoord);
  vec4 dispColor = texture2D(image, textCoord);

  const float max = 10.0;
  float weight = 0.65;

  for (float i = 0.0; i < max; i += 0.25) {
    if(i > abs(magnitude)) {
      break;
    }
    vec4 dispColorUp = texture2D(image, textCoord + vec2(
      cos(angle) * -i * sign(magnitude) / u_size.x,
      sin(angle) * -i * sign(magnitude) / u_size.y
    ));
    vec4 dispColorDown = texture2D(image, textCoord + vec2(
      cos(angle) * i * sign(magnitude) / u_size.x,
      sin(angle) * i * sign(magnitude) / u_size.y
    ));
    dispColor = dispColor * (1.0 - weight) + dispColorDown * weight * 0.5 + dispColorUp * weight * 0.5;
    weight *= 0.70;
  }

  return dispColor;
}

void main() {
  vec3 ripple = vec3(M_PI/8.0, u_time / 200.0, 1.0);

  if (u_renderParallax == 1) {
    gl_FragColor = texture2D(u_image,  v_texCoord * vec2(1.0, -1.0) + vec2(u_time * u_parallax.x / 5000.0, 1.0));
    return;
  }
  if (u_renderMap == 1) {
    float xTiles = floor(u_size.x / u_tileSize.x);
    float yTiles = floor(u_size.y / u_tileSize.y);

    float xT = (v_texCoord.x * u_size.x) / u_tileSize.x;
    float yT = (v_texCoord.y * u_size.y) / u_tileSize.y;

    float inv_xTiles = 1.0 / xTiles;
    float inv_yTiles = 1.0 / yTiles;

    float xTile = floor(xT) * inv_xTiles;
    float yTile = floor(yT) * inv_yTiles;

    float xOff = (xT * inv_xTiles - xTile) * xTiles;
    float yOff = (yT * inv_yTiles - yTile) * yTiles * -1.0 + 1.0;

    if (u_renderMode == 1) {
      gl_FragColor = vec4(xTile, yTile, 0, 1.0);
      return;
    }

    if (u_renderMode == 2) {
      gl_FragColor = vec4(xTile, yTile, xOff + yOff * 0.5, 1.0);
      return;
    }

    vec4 tile = texture2D(u_tileMapping, v_texCoord * vec2(1.0, -1.0) + vec2(0.0, 1.0));

    float lo = tile.r * 256.0;
    float hi = tile.g * 256.0 * 256.0;

    float tileNumber = lo + hi;

    if (tileNumber == 0.0) {
      gl_FragColor.a = 0.0;
      return;
    }

    if (u_renderMode == 3) {
      gl_FragColor = tile;
      gl_FragColor.b = 0.5;
      gl_FragColor.a = 1.0;
      return;
    }

    if (u_renderMode == 4) {
      gl_FragColor = vec4(
        mod(tileNumber, 256.0) / 256.0
        , mod(tileNumber, 256.0) / 256.0
        , mod(tileNumber, 256.0) / 256.0
        , 1.0
      );
      return;
    }

    float xWrap = u_mapTextureSize.x / u_tileSize.x;
    float yWrap = u_mapTextureSize.y / u_tileSize.y;

    float tileSetX = floor(mod((-1.0 + tileNumber), xWrap));
    float tileSetY = floor((-1.0 + tileNumber) / xWrap);

    gl_FragColor = texture2D(u_tiles, vec2(
      xOff / xWrap + tileSetX * (u_tileSize.y / u_mapTextureSize.y)
      , yOff / yWrap + tileSetY * (u_tileSize.y / u_mapTextureSize.y)
    ));

    return;
  }

  vec4 originalColor = texture2D(u_image,  v_texCoord);
  vec4 effectColor   = texture2D(u_effect, v_texCoord);

  // This if/else block only applies
  // when we're drawing the effectBuffer
  if (u_region.r > 0.0 || u_region.g > 0.0 || u_region.b > 0.0) {
    if (masked < 1.0 || originalColor.a > 0.0) {
      gl_FragColor = u_region;
    }
    return;
  }
  else if (u_region.a > 0.0) {
    if (sorted > 0.0) {
      gl_FragColor = vec4(0, 0, 0, originalColor.a > 0.0 ? 1.0 : 0.0);
    }
    else {
      gl_FragColor = vec4(0, 0, 0, 0.0);
    }
    return;
  };

  if (u_renderMode == 5) {
    gl_FragColor = effectColor;
    return;
  }

  // This if/else block only applies
  // when we're drawing the drawBuffer
  if (effectColor == vec4(0, 1, 1, 1)) { // Water region
    vec2 texCoord = v_texCoord;
    vec4 v_blurredColor = originalColor;
    if (displace > 0.0) {
      texCoord = rippleX(v_texCoord, ripple.x, ripple.y, ripple.z);
      v_blurredColor = texture2D(u_image, texCoord);
    }
    if (blur > 0.0) {
      v_blurredColor = linearBlur(u_image, 0.0, 1.0, texCoord);
    }
    gl_FragColor = v_blurredColor * 0.65 + effectColor * 0.35;
  }
  else if (effectColor == vec4(1, 0, 0, 1)) { // Fire region
    vec2 v_displacement = rippleY(v_texCoord, ripple.x * 2.0, ripple.y * 1.5, ripple.z * 0.25);
    vec4 v_blurredColor = originalColor;
    if (displace > 0.0) {
      v_blurredColor = texture2D(u_image, v_displacement);
    }
    if (blur > 0.0) {
      v_blurredColor = motionBlur(u_image, -M_TAU, 1.0, v_displacement);
    }
    gl_FragColor = v_blurredColor * 0.75 + effectColor * 0.25;
  }
  else { // Null region
    gl_FragColor = originalColor;
  }
}
