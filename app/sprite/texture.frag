// texture.fragZ

precision mediump float;

uniform vec4      u_color;
uniform sampler2D u_image;
varying vec2      v_texCoord;

void main() {
   gl_FragColor = texture2D(u_image, v_texCoord);
   // gl_FragColor = vec4(1.0,0.0,1.0,1.0);
   // gl_FragColor = gl_PointCoord.yyxx;
}
