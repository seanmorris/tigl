precision mediump float;

uniform vec4      u_color;
uniform sampler2D u_image;
varying vec2      v_texCoord;

void main() {
   gl_FragColor = u_color;
   gl_FragColor = texture2D(u_image, v_texCoord);
}