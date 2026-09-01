import { StyleSheet } from "react-native";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

/** 웹 .dot-pattern (24px 간격 1.5px 닷) 배경의 RN 구현 */
export function DotPattern({ color = "#f3f4f6" }: { color?: string }) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="stickki-dots" width={24} height={24} patternUnits="userSpaceOnUse">
          <Circle cx={1.5} cy={1.5} r={1.5} fill={color} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#stickki-dots)" />
    </Svg>
  );
}
