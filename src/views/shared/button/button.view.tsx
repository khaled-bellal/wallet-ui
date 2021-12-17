import React from "react";
import PropTypes from "prop-types";
import clsx from "clsx";

import useButtonStyles from "./button.styles";

interface ButtonProps {
  Icon?: React.ReactElement<React.SVGProps<SVGSVGElement>>;
  text?: string;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}

function Button({ Icon, text, className, disabled, onClick }: ButtonProps): JSX.Element {
  const classes = useButtonStyles({ rounded: !text });

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx({
        [classes.root]: true,
        ...(className ? { [className]: true } : {}),
      })}
    >
      {Icon}
      {text && <p className={clsx({ [classes.textSpacer]: Icon !== undefined })}>{text}</p>}
    </button>
  );
}

Button.propTypes = {
  Icon: PropTypes.element,
  text: PropTypes.string,
  onClick: PropTypes.func,
};

export default Button;
