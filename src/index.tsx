const React = window.React;

function calcRelativeXPositionRate(clientX: number, element: HTMLElement) {
  return (clientX - element.getBoundingClientRect().left) / element.clientWidth;
}
function calcRelativeYPositionRate(clientY: number, element: HTMLElement) {
  return (clientY - element.getBoundingClientRect().top) / element.clientHeight;
}
function lerpColor(_a: string, _b: string, amount: number): string {
  const a = parseInt(_a.slice(1,7),16);
  const b = parseInt(_b.slice(1,7),16);
  const ar = a >> 16,
        ag = a >> 8 & 0xff,
        ab = a & 0xff,

        br = b >> 16,
        bg = b >> 8 & 0xff,
        bb = b & 0xff,

        rr = ar + amount * (br - ar),
        rg = ag + amount * (bg - ag),
        rb = ab + amount * (bb - ab);

  return "#" + ("000000" + ((rr << 16) + (rg << 8) + (rb | 0)).toString(16)).slice(-6);
};

function hexToRGB(p_hex: string) {
  let hex = p_hex.slice(1,p_hex.length);
  if(hex.length !== 6) {
    throw new Error("rgba hex notation cannot be parsed. input value was " + p_hex);
  }
  const h = parseInt(hex,16);
  return {
    r: h >> 16,
    g: h >> 8 & 0xff,
    b: h & 0xff,
  };
}

type RGBA = {
  r: number,
  g: number,
  b: number,
  a: number
}

function getBlendGradientCSS(p_colorKeys: ColorKey[], p_alphaKeys: AlphaKey[]): string {
  const points: [color: RGBA, time: number][] = [];
  let colorKeys = [...p_colorKeys].sort((a,b) => a.time === b.time ? 0 : a.time > b.time ? 1 : -1);
  let alphaKeys = [...p_alphaKeys].sort((a,b) => a.time === b.time ? 0 : a.time > b.time ? 1 : -1);
  
  // 要素２以上に揃える
  if(colorKeys.length === 1) {
    colorKeys = [{...colorKeys[0],time: 0}, {...colorKeys[0], time: 1}]
  }
  if(colorKeys.length === 0) {
    colorKeys = [{color: "#ffffff", time: 0}, {color: "#ffffff", time: 1}]
  }
  if(alphaKeys.length === 0) {
    alphaKeys = [{alpha: 255, time: 0}, {alpha: 255, time: 1}]
  }
  if(alphaKeys.length === 1) {
    alphaKeys === [{...alphaKeys[0], time: 0}, {...alphaKeys[0], time: 1}]
  }

  for(const colorKey of colorKeys) {
    const leftAlphaKeyCount = alphaKeys.filter(x => x.time < colorKey.time).length;
    const leftAlphaKey = leftAlphaKeyCount > 0 ? alphaKeys[leftAlphaKeyCount - 1] : alphaKeys.length > 0 ? alphaKeys[0] : { alpha: 255, time: 0};
    const rightAlphaKey = alphaKeys.length > leftAlphaKeyCount ? alphaKeys[leftAlphaKeyCount] : alphaKeys.length > 0 ? alphaKeys[alphaKeys.length - 1] : {alpha: 255, time: 1};
    const t = (colorKey.time - leftAlphaKey.time) / (rightAlphaKey.time - leftAlphaKey.time);
    const lerpedAlpha = leftAlphaKey.alpha + (rightAlphaKey.alpha - leftAlphaKey.alpha) * t;

    points.push([{...hexToRGB(colorKey.color), a: lerpedAlpha}, colorKey.time]);
  }

  for(const alphaKey of alphaKeys) {
    const sameTimeIndex = points.findIndex(x => x[1] === alphaKey.time);
    if(sameTimeIndex >= 0) {
      const point = points[sameTimeIndex];
      points[sameTimeIndex] = [{...point[0], a: alphaKey.alpha},point[1]]
      continue;
    }
    
    const leftColorKeyCount = colorKeys.filter(x => x.time < alphaKey.time).length;
    const leftColorKey = leftColorKeyCount > 0 ? colorKeys[leftColorKeyCount - 1] : colorKeys.length > 0 ? colorKeys[0] : { color: "#ffffff", time: 0};
    const rightColorKey = colorKeys.length > leftColorKeyCount ? colorKeys[leftColorKeyCount] : colorKeys.length > 0 ? colorKeys[colorKeys.length - 1] : {color: "#ffffff", time: 1};
    const t = (alphaKey.time - leftColorKey.time) / (rightColorKey.time - leftColorKey.time);
    const lerpedColor = leftColorKey.time !== rightColorKey.time ? lerpColor(leftColorKey.color, rightColorKey.color, t) : leftColorKey.color;
    points.push([{...hexToRGB(lerpedColor), a: alphaKey.alpha},alphaKey.time]);
  }

  points.sort((a,b) => a[1] === b[1] ? 0 : a[1] > b[1] ? 1 : -1);
  
  return `linear-gradient(to right, ${points.map(point => {
    const [color, time] = point;
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255}) ${time * 100}%`
  }).join(", ")})`
}



type ColorKey = {
  color: string; // hex string. e.g #06ba55
  time: number;
};

function isColorKey(value: any): value is ColorKey {
  return (
    value !== undefined && value.color !== undefined && typeof(value.color) === "string" && value.time !== undefined
  );
}

type AlphaKey = {
  alpha: number;
  time: number;
};

function isAlphaKey(value: any): value is AlphaKey {
  return (
    value !== undefined && value.alpha !== undefined && typeof(value.alpha) === "number" && value.time !== undefined
  );
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

let incrementId: number = 0;

export default function GradientEditor({
  value,
  onChange,
}: InputGradientProps) {
  const [colorKeys, setColorKeys] = React.useState<(ColorKey & {id: number})[]>(value.colorKeys.map(x => {return {...x, id: incrementId++}}));
  const [alphaKeys, setAlphaKeys] = React.useState<(AlphaKey & {id: number})[]>(value.alphaKeys.map(x => {return {...x, id: incrementId++}}));
  const [mode, setMode] = React.useState<"blend" | "fixed">(value.mode);
  const [selectedPinId, setSelectedPinId] = React.useState<number | null>(null);
  const [showMenu, setShowMenu] = React.useState(false);

  const notifyValueChanged = () => {
    onChange({
      colorKeys,
      alphaKeys,
      mode: value.mode,
    });
  };

  React.useEffect(() => {
    window.addEventListener("click", (e) => {
      setSelectedPinId(null);
      setShowMenu(false);
    });
  }, []);

  const getStyle = () => {
    return {
      background: getBlendGradientCSS(colorKeys,alphaKeys)
    };
  };

  // on double clicked, creates new point
  const handleDoubleClick = (event: React.MouseEvent) => {
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
          id: incrementId++,
          alpha: 255,
          time: xpos,
        },
      ]);
    } else {
      setColorKeys((keys) => [...keys, { id: incrementId++, color: "#ffffff", time: xpos }]);
    }
    notifyValueChanged();
  };

  const getSelectedKey = (): ColorKey & {id: number} | AlphaKey & {id:number} | undefined => {
    if (selectedPinId || selectedPinId === 0) {
      let ret = colorKeys.find(x => x.id === selectedPinId);
      if(ret) return ret;
      return alphaKeys.find(x => x.id === selectedPinId);
    }
    return undefined;
  };

  return (
    <div className="RG_gradient-container"
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      tabIndex={0}
    >
      <div className="RG_gradient-background"></div>
      <div
        className="RG_gradient-bar"
        style={getStyle()}
        onDoubleClick={(event) => {
          handleDoubleClick(event);
        }}
      >
        {alphaKeys.map((key, index) => (
          <Pin
            position={key.time}
            isColorPin={false}
            isSelected={key.id === selectedPinId}
            key={key.id}
            onPositionUpdate={(pos) => {
              setAlphaKeys((keys) => {
                keys[index] = {
                  ...keys[index],
                  time: pos,
                };
                return [...keys];
              });
            }}
            onPositionChange={(_) => {
              notifyValueChanged();
            }}
            onClick={() => {
              setSelectedPinId(key.id);
            }}
            onDelete={() => {
              setAlphaKeys((keys) => {
                keys.splice(index, 1);
                return [...keys ];
              });
            }}
            color={`rgba(255,255,255,${key.alpha / 255})`}
          />
        ))}
        {colorKeys.map((key, index) => (
          <Pin
            position={key.time}
            isColorPin={true}
            isSelected={key.id === selectedPinId}
            key={key.id}
            onPositionChange={(_) => {
              notifyValueChanged();
            }}
            onPositionUpdate={(pos) => {
              setColorKeys((keys) => {
                keys[index] = {
                  ...keys[index],
                  time: pos,
                };
                return [...keys];
              });
            }}
            onClick={() => {
              setSelectedPinId(key.id);
            }}
            onDelete={() => {
              setColorKeys((keys) => {
                keys.splice(index, 1);
                return [...keys ];
              });
            }}
            color={key.color}
          />
        ))}
        <input
          type="color"
          style={{
            visibility: isColorKey(getSelectedKey()) ? "visible" : "hidden",
            position: "absolute",
            left: `calc(${(getSelectedKey()?.time ?? 0) * 100}% - 21px)`,
            bottom: -30,
            zIndex: 100,
          }}
          value={(() => {
            var selectedKey = getSelectedKey();
            if (isColorKey(selectedKey)) {
              return selectedKey.color;
            } else {
              return "#000000";
            }
          })()}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            if (selectedPinId || selectedPinId === 0) {
              // const [index, isAlpha] = selectedPinInfo;
              const selectedKey = getSelectedKey();
              if (isColorKey(selectedKey)) {
                const keyToChange = selectedKey;
                keyToChange.color = event.target.value;
                const index = colorKeys.findIndex(x => x.id === selectedPinId);
                setColorKeys((keys) => {
                  keys[index] = keyToChange;
                  return keys.concat();
                });
              }
            }
          }}
          onBlur={(_) => notifyValueChanged()}
        />
        <input
          type="range"
          min={0}
          max={255}
          step={1}
          style={{
            visibility: isAlphaKey(getSelectedKey()) ? "visible" : "hidden",
            position: "absolute",
            left: `calc(${(getSelectedKey()?.time ?? 0) * 100}% - 50px)`,
            top: -20,
            width: 100,
            zIndex: 100,
          }}
          value={(() => {
            var selectedKey = getSelectedKey();
            if (isAlphaKey(selectedKey)) {
              return selectedKey.alpha;
            } else {
              return 0;
            }
          })()}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            const selectedKey = getSelectedKey();
            if (isAlphaKey(selectedKey)) {
              const index = alphaKeys.findIndex(x => x.id === selectedPinId);
              selectedKey.alpha = Math.floor(event.target.valueAsNumber);
              setAlphaKeys((keys) => {
                keys[index] = selectedKey;
                return [...keys];
              });
            }
          }}
          onBlur={(_) => notifyValueChanged()}
        />
      </div>
    
    </div>);
}

type PinProps = {
  position: number;
  onPositionChange: (position: number) => void;
  onPositionUpdate: (position: number) => void;
  onClick: React.MouseEventHandler;
  onDelete: () => void;
  isColorPin: boolean;
  color?: string;
  isSelected: boolean;
};

function Pin(props: PinProps) {
  const [position, setPosition] = React.useState(props.position);

  const [isAboutToDeleted, SetIsAboutToDeleted] = React.useState(false);

  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrag = function (event: React.DragEvent) {
    const thisElm = event.target! as HTMLElement;
    const parent = thisElm.parentNode! as HTMLElement;
    const thisRect = (event.target! as HTMLElement).getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    if (
      // alpha
      (!props.isColorPin && parentRect.top - event.clientY > 20) ||
      // color
      (props.isColorPin && parentRect.bottom - event.clientY < -20)
    ) {
      SetIsAboutToDeleted(true);
    } else {
      SetIsAboutToDeleted(false);
    }

    //なぜか最初にブラウザからおかしな値が来たりするので、しきい値を設ける。
    if (thisElm.offsetLeft - event.clientX > 20) {
      return;
    }

    const rawPosition = (event.clientX - parentRect.left /* 決め打ち調整 */) / parentRect.width;

    if (rawPosition < 0) {
      return;
    }
    const clampedPosition = Math.min(Math.max(rawPosition, 0), 1);
    setPosition(clampedPosition);

    props.onPositionUpdate(clampedPosition);
  };


  const handleClick = function (event: React.MouseEvent) {
    event.stopPropagation();
    props.onClick(event);
  };

  const handleDragStart = (event: React.DragEvent) => {
    // x軸に従って動くので、ゴーストは消しておく
    event.dataTransfer.setDragImage(new Image(),0,0,);
    event.dataTransfer.dropEffect = "move";
    setIsDragging(true);
  }

  const handleDragEnd = function (event: React.DragEvent) {
    setIsDragging(false);

    const thisElm = event.target! as HTMLElement;
    const parent = thisElm.parentNode! as HTMLElement;
    const parentRect = parent.getBoundingClientRect();
    
    const _isAboutToDeleted = (!props.isColorPin && parentRect.top - event.clientY > 15 || parentRect.bottom - event.clientY < -15);

    if (_isAboutToDeleted) {
      console.log("delete");
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
      backgroundColor: props.color ?? "lightgray",
    } as React.CSSProperties;

    return props.isColorPin
      ? { ...common, bottom: -5 }
      : { ...common, top: -5 };
  };

  return (
    <span
      data-del={isAboutToDeleted}
      className="RG_pin"
      draggable
      style={createStyle()}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDrag={handleDrag}
    />
  );
}
