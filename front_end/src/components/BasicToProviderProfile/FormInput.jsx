import React from "react";
import classes from "./FormInput.module.css"; // צרי קובץ CSS קטן עבורו

const FormInput = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  required,
  placeholder,
  extraProps = {},
}) => {
  return (
    <div className={classes.fieldGroup}>
      <label className={classes.label}>{label}</label>
      <input
        className={classes.input}
        type={type}
        name={name}
        placeholder={placeholder}
        value={value || ""}
        onChange={onChange}
        required={required}
        {...extraProps}
      />
    </div>
  );
};

export default FormInput;
