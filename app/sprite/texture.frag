// texture.frag

precision mediump float;

uniform sampler2D u_image;
uniform vec4 u_color;
varying vec2 v_texCoord;
uniform vec3 u_tileNo;


vec2 ripple(vec2 texCoord, float ripple, float disp) {
  return vec2(v_texCoord.x + sin(v_texCoord.y * ripple) * disp, v_texCoord.y);
}

void main() {
/*
  vec2 v_displaced = ripple(v_texCoord, 0.0, 0.0);
/*/
  vec2 v_displaced = ripple(v_texCoord, 3.1415 * 2.0, 0.025);
  if (v_displaced.x > 1.0) {
    v_displaced.x = 1.0 - (v_displaced.x - 1.0);
  }
  if (v_displaced.x < 0.0) {
    v_displaced.x = abs(v_displaced.x);
  }
//*/
  if (u_tileNo.z > 0.0) {
    gl_FragColor = vec4(u_tileNo.x / u_tileNo.y, 0, 0, 1.0);
  } 
  else {
    gl_FragColor = texture2D(u_image, v_displaced);
  }
}
