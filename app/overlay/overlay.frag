precision mediump float;

uniform vec4 u_color;
varying vec2 v_texCoord;

void main() {
   // gl_FragColor = texture2D(u_image, v_texCoord);
   gl_FragColor = vec4(1.0, 1.0, 0.0, 0.25);
}
