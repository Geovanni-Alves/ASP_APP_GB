/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import { Button, Flex, Grid, SwitchField } from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { API } from "aws-amplify";
import { getKidsSchedule } from "../graphql/queries";
import { updateKidsSchedule } from "../graphql/mutations";
export default function KidsScheduleUpdateForm(props) {
  const {
    id: idProp,
    kidsSchedule: kidsScheduleModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
  };
  const [Monday, setMonday] = React.useState(initialValues.Monday);
  const [Tuesday, setTuesday] = React.useState(initialValues.Tuesday);
  const [Wednesday, setWednesday] = React.useState(initialValues.Wednesday);
  const [Thursday, setThursday] = React.useState(initialValues.Thursday);
  const [Friday, setFriday] = React.useState(initialValues.Friday);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = kidsScheduleRecord
      ? { ...initialValues, ...kidsScheduleRecord }
      : initialValues;
    setMonday(cleanValues.Monday);
    setTuesday(cleanValues.Tuesday);
    setWednesday(cleanValues.Wednesday);
    setThursday(cleanValues.Thursday);
    setFriday(cleanValues.Friday);
    setErrors({});
  };
  const [kidsScheduleRecord, setKidsScheduleRecord] = React.useState(
    kidsScheduleModelProp
  );
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? (
            await API.graphql({
              query: getKidsSchedule.replaceAll("__typename", ""),
              variables: { id: idProp },
            })
          )?.data?.getKidsSchedule
        : kidsScheduleModelProp;
      setKidsScheduleRecord(record);
    };
    queryData();
  }, [idProp, kidsScheduleModelProp]);
  React.useEffect(resetStateValues, [kidsScheduleRecord]);
  const validations = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue
  ) => {
    const value =
      currentValue && getDisplayValue
        ? getDisplayValue(currentValue)
        : currentValue;
    let validationResponse = validateField(value, validations[fieldName]);
    const customValidator = fetchByPath(onValidate, fieldName);
    if (customValidator) {
      validationResponse = await customValidator(value, validationResponse);
    }
    setErrors((errors) => ({ ...errors, [fieldName]: validationResponse }));
    return validationResponse;
  };
  return (
    <Grid
      as="form"
      rowGap="15px"
      columnGap="15px"
      padding="20px"
      onSubmit={async (event) => {
        event.preventDefault();
        let modelFields = {
          Monday: Monday ?? null,
          Tuesday: Tuesday ?? null,
          Wednesday: Wednesday ?? null,
          Thursday: Thursday ?? null,
          Friday: Friday ?? null,
        };
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map((item) =>
                  runValidationTasks(fieldName, item)
                )
              );
              return promises;
            }
            promises.push(
              runValidationTasks(fieldName, modelFields[fieldName])
            );
            return promises;
          }, [])
        );
        if (validationResponses.some((r) => r.hasError)) {
          return;
        }
        if (onSubmit) {
          modelFields = onSubmit(modelFields);
        }
        try {
          Object.entries(modelFields).forEach(([key, value]) => {
            if (typeof value === "string" && value === "") {
              modelFields[key] = null;
            }
          });
          await API.graphql({
            query: updateKidsSchedule.replaceAll("__typename", ""),
            variables: {
              input: {
                id: kidsScheduleRecord.id,
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            onSuccess(modelFields);
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "KidsScheduleUpdateForm")}
      {...rest}
    >
      <SwitchField
        label="Monday"
        defaultChecked={false}
        isDisabled={false}
        isChecked={Monday}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              Monday: value,
              Tuesday,
              Wednesday,
              Thursday,
              Friday,
            };
            const result = onChange(modelFields);
            value = result?.Monday ?? value;
          }
          if (errors.Monday?.hasError) {
            runValidationTasks("Monday", value);
          }
          setMonday(value);
        }}
        onBlur={() => runValidationTasks("Monday", Monday)}
        errorMessage={errors.Monday?.errorMessage}
        hasError={errors.Monday?.hasError}
        {...getOverrideProps(overrides, "Monday")}
      ></SwitchField>
      <SwitchField
        label="Tuesday"
        defaultChecked={false}
        isDisabled={false}
        isChecked={Tuesday}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              Monday,
              Tuesday: value,
              Wednesday,
              Thursday,
              Friday,
            };
            const result = onChange(modelFields);
            value = result?.Tuesday ?? value;
          }
          if (errors.Tuesday?.hasError) {
            runValidationTasks("Tuesday", value);
          }
          setTuesday(value);
        }}
        onBlur={() => runValidationTasks("Tuesday", Tuesday)}
        errorMessage={errors.Tuesday?.errorMessage}
        hasError={errors.Tuesday?.hasError}
        {...getOverrideProps(overrides, "Tuesday")}
      ></SwitchField>
      <SwitchField
        label="Wednesday"
        defaultChecked={false}
        isDisabled={false}
        isChecked={Wednesday}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              Monday,
              Tuesday,
              Wednesday: value,
              Thursday,
              Friday,
            };
            const result = onChange(modelFields);
            value = result?.Wednesday ?? value;
          }
          if (errors.Wednesday?.hasError) {
            runValidationTasks("Wednesday", value);
          }
          setWednesday(value);
        }}
        onBlur={() => runValidationTasks("Wednesday", Wednesday)}
        errorMessage={errors.Wednesday?.errorMessage}
        hasError={errors.Wednesday?.hasError}
        {...getOverrideProps(overrides, "Wednesday")}
      ></SwitchField>
      <SwitchField
        label="Thursday"
        defaultChecked={false}
        isDisabled={false}
        isChecked={Thursday}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              Monday,
              Tuesday,
              Wednesday,
              Thursday: value,
              Friday,
            };
            const result = onChange(modelFields);
            value = result?.Thursday ?? value;
          }
          if (errors.Thursday?.hasError) {
            runValidationTasks("Thursday", value);
          }
          setThursday(value);
        }}
        onBlur={() => runValidationTasks("Thursday", Thursday)}
        errorMessage={errors.Thursday?.errorMessage}
        hasError={errors.Thursday?.hasError}
        {...getOverrideProps(overrides, "Thursday")}
      ></SwitchField>
      <SwitchField
        label="Friday"
        defaultChecked={false}
        isDisabled={false}
        isChecked={Friday}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              Monday,
              Tuesday,
              Wednesday,
              Thursday,
              Friday: value,
            };
            const result = onChange(modelFields);
            value = result?.Friday ?? value;
          }
          if (errors.Friday?.hasError) {
            runValidationTasks("Friday", value);
          }
          setFriday(value);
        }}
        onBlur={() => runValidationTasks("Friday", Friday)}
        errorMessage={errors.Friday?.errorMessage}
        hasError={errors.Friday?.hasError}
        {...getOverrideProps(overrides, "Friday")}
      ></SwitchField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Reset"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          isDisabled={!(idProp || kidsScheduleModelProp)}
          {...getOverrideProps(overrides, "ResetButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={
              !(idProp || kidsScheduleModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
