#version 450

layout(location = 0) in vec2 textureCoordinate;
layout(location = 0) out vec4 fragmentColor;

layout(set = 0, binding = 0) uniform ColorSettings {
    vec4 baseColor;
    float pulse;
    float opacity;
} settings;

vec3 clampColor(vec3 value) {
    return clamp(value, vec3(0.0), vec3(1.0));
}

float ringMask(vec2 coordinate, float radius) {
    vec2 centered = coordinate - vec2(0.5);
    float distanceFromCenter = length(centered);
    return 1.0 - smoothstep(radius - 0.02, radius + 0.02, distanceFromCenter);
}

void main() {
    vec2 coordinate = clamp(textureCoordinate, vec2(0.0), vec2(1.0));
    float radius = 0.15 + 0.05 * abs(sin(settings.pulse));
    float mask = ringMask(coordinate, radius);
    vec3 shaded = clampColor(settings.baseColor.rgb * mask);
    vec3 accent = mix(shaded, vec3(0.1, 0.4, 0.8), 0.15);
    vec3 preview = mix(accent, settings.baseColor.rgb, mask * 0.05);
    float vignette = 1.0 - smoothstep(0.2, 0.8, length(coordinate - vec2(0.5)));
    vec3 finalColor = clampColor(preview * vignette);
    float alpha = clamp(settings.opacity, 0.0, 1.0);
    if (alpha <= 0.0) discard;
    alpha = mix(alpha, alpha * mask, 0.1);
    fragmentColor = vec4(finalColor, alpha);
}
