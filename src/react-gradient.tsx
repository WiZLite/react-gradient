import React, {
  useState,
  MouseEvent,
  MouseEventHandler,
  DragEvent,
} from "react";

function calcRelativeXPositionRate(clientX: number, element: HTMLElement) {
  return (clientX - element.getBoundingClientRect().left) / element.clientWidth;
}
function calcRelativeYPositionRate(clientY: number, element: HTMLElement) {
  return (clientY - element.getBoundingClientRect().top) / element.clientHeight;
}

function getKeyHash(key: ColorKey | AlphaKey): string {
  let ret = "";
  if (isColorKey(key)) {
    return `c-${key.color}-${key.time}`;
  } else if (isAlphaKey(key)) {
    return `a-${key.alpha}-${key.time}`;
  }

  throw new Error();
}

type ColorKey = {
  color: string; // hex string. e.g #06ba55
  time: number;
};

function isColorKey(value: any): value is ColorKey {
  return value.color && value.time;
}

type AlphaKey = {
  alpha: number;
  time: number;
};

function isAlphaKey(value: any): value is ColorKey {
  return value.alpha && value.time;
}

type Gradient = {
  colorKeys: ColorKey[];
  alphaKeys: AlphaKey[];
  mode: "blend" | "fixed";
};
type InputGradientProps = {
  value: Gradient;
  onChange: (value: Gradient) => void;
};

export default function GradientEditor({
  value,
  onChange,
}: InputGradientProps) {
  const [colorKeys, setColorKeys] = useState<ColorKey[]>(value.colorKeys);
  const [alphaKeys, setAlphaKeys] = useState<AlphaKey[]>(value.alphaKeys);
  const [mode, setMode] = useState<"blend" | "fixed">(value.mode);
  const [selectedPinInfo, setSelectedPinInfo] = useState<
    null | [index: number, isAlpha: boolean]
  >(null);

  const notifyValueChanged = () => {
    onChange({
      colorKeys,
      alphaKeys,
      mode: value.mode,
    });
  };

  const getGradientStyle = () => {
    if (mode === "blend") {
      return `linear-gradient(to right,${colorKeys
        .map((key) => `${key} ${key.time * 100}%`)
        .join(`,`)})`;
    } else {
      return `linear-gradient(to right, ${colorKeys
        .map(
          (key, index) =>
            `${key} ${key.time}% ${colorKeys[index + 1] ?? "100"}%`
        )
        .join(`,`)})`;
    }
  };

  // on double clicked, creates new point
  const handleDoubleClick = (event: MouseEvent) => {
    const xpos = calcRelativeXPositionRate(
      event.clientX,
      event.target! as HTMLElement
    );
    const ypos = calcRelativeYPositionRate(
      event.clientY,
      event.target! as HTMLElement
    );

    const isAlpha = ypos < 0.5;
    if (isAlpha) {
      setAlphaKeys((keys) => [
        ...keys,
        {
          alpha: 1,
          time: xpos,
        },
      ]);
    } else {
      setColorKeys((keys) => [...keys, { color: "#ffffff", time: xpos }]);
    }
    notifyValueChanged();
  };

  const getSelectedKey = (): ColorKey | AlphaKey | undefined => {
    if (selectedPinInfo) {
      const [index, isAlpha] = selectedPinInfo;
      if (isAlpha) {
        return alphaKeys[index];
      } else {
        return colorKeys[index];
      }
    }
    return undefined;
  };

  return (
    <div
      className="gradient-container"
      style={{
        background: getGradientStyle(),
      }}
      onDoubleClick={(event) => {
        handleDoubleClick(event);
      }}
    >
      {alphaKeys.map((key, index) => (
        <Pin
          position={key.time}
          isColorPin={false}
          key={getKeyHash(key)}
          onPositionUpdate={(pos) => {
            setAlphaKeys((keys) => {
              keys[index] = {
                ...keys[index],
                time: pos,
              };
              return keys;
            });
          }}
          onPositionChange={(_) => {
            notifyValueChanged();
          }}
          onClick={() => {
            setSelectedPinInfo([index, true]);
          }}
          onDelete={() => {
            setAlphaKeys((keys) => {
              keys.splice(index, 1);
              return { ...keys };
            });
          }}
        />
      ))}
      {colorKeys.map((key, index) => (
        <Pin
          position={key.time}
          isColorPin={true}
          key={getKeyHash(key)}
          onPositionChange={(_) => {
            notifyValueChanged();
          }}
          onPositionUpdate={(pos) => {
            setColorKeys((keys) => {
              keys[index] = {
                ...keys[index],
                time: pos,
              };
              return keys;
            });
          }}
          onClick={() => {
            setSelectedPinInfo([index, false]);
          }}
          onDelete={() => {
            setColorKeys((keys) => {
              keys.splice(index, 1);
              return { ...keys };
            });
          }}
        />
      ))}
      <input
        type="color"
        style={{
          visibility: isColorKey(getSelectedKey()) ? "visible" : "hidden",
          position: "absolute",
          left: `calc(${(getSelectedKey()?.time ?? 0) * 100}% - 21px)`,
        }}
        onChange={(event) => {
          if (selectedPinInfo) {
            const [index, isAlpha] = selectedPinInfo;
            if (!isAlpha) {
              const keyToChange = colorKeys[index];
              keyToChange.color = event.target.value;

              setColorKeys((keys) => {
                keys[index] = keyToChange;
                return keys;
              });
            }
          }
        }}
      />
    </div>
  );
}

type PinProps = {
  position: number;
  onPositionChange: (position: number) => void;
  onPositionUpdate: (position: number) => void;
  onClick: MouseEventHandler;
  onDelete: () => void;
  isColorPin: boolean;
};

function Pin(props: PinProps) {
  const [position, setPosition] = useState(props.position);

  const [isAboutToDeleted, SetIsAboutToDeleted] = useState(false);

  const handleDrag = function (event: DragEvent) {
    if (
      (
        (event.target! as HTMLElement).parentNode as HTMLElement
      ).getBoundingClientRect().top -
        event.clientY >
        20 ||
      (props.isColorPin &&
        (
          (event.target! as HTMLElement).parentNode as HTMLElement
        ).getBoundingClientRect().bottom -
          event.clientY <
          -20)
    ) {
      SetIsAboutToDeleted(true);
    } else {
      SetIsAboutToDeleted(false);
    }

    const relativeX =
      event.clientX -
      (
        (event.target! as HTMLElement).parentNode! as HTMLElement
      ).getBoundingClientRect().x;

    const parentWidth = (
      (event.target! as HTMLElement).parentNode! as HTMLElement
    ).offsetWidth;

    const rawPosition = relativeX / parentWidth;
    if (rawPosition < 0) {
      return;
    }
    const clampedPosition = Math.min(Math.max(rawPosition, 0), 1);

    setPosition(clampedPosition);

    props.onPositionUpdate(clampedPosition);
  };

  const handleClick = function (event: MouseEvent) {
    props.onClick(event);
  };

  const handleDragEnd = function (event: DragEvent) {
    if (isAboutToDeleted) {
      if (props.onDelete) {
        props.onDelete();
        return;
      }
    }

    props.onPositionChange(position);
  };

  const createStyle = () => {
    const common = {
      left: `calc(${position * 100}% - 5px)`,
    };

    return props.isColorPin
      ? { ...common, bottom: -5 }
      : { ...common, top: -5 };
  };

  return (
    <span
      className="pin"
      draggable
      style={createStyle()}
      onDragEnd={handleDragEnd}
      onDrag={handleDragEnd}
    />
  );
}
