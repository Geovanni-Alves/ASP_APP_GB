/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import { Button, Flex, Grid, TextField } from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { API } from "aws-amplify";
import { getWeekDayRoutes } from "../graphql/queries";
import { updateWeekDayRoutes } from "../graphql/mutations";
export default function WeekDayRoutesUpdateForm(props) {
  const {
    id: idProp,
    weekDayRoutes: weekDayRoutesModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    date: "",
    weekDay: "",
    vanID: "",
    kidID: "",
    Order: "",
    kidName: "",
    kidDropOffAddress: "",
  };
  const [date, setDate] = React.useState(initialValues.date);
  const [weekDay, setWeekDay] = React.useState(initialValues.weekDay);
  const [vanID, setVanID] = React.useState(initialValues.vanID);
  const [kidID, setKidID] = React.useState(initialValues.kidID);
  const [Order, setOrder] = React.useState(initialValues.Order);
  const [kidName, setKidName] = React.useState(initialValues.kidName);
  const [kidDropOffAddress, setKidDropOffAddress] = React.useState(
    initialValues.kidDropOffAddress
  );
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = weekDayRoutesRecord
      ? { ...initialValues, ...weekDayRoutesRecord }
      : initialValues;
    setDate(cleanValues.date);
    setWeekDay(cleanValues.weekDay);
    setVanID(cleanValues.vanID);
    setKidID(cleanValues.kidID);
    setOrder(cleanValues.Order);
    setKidName(cleanValues.kidName);
    setKidDropOffAddress(cleanValues.kidDropOffAddress);
    setErrors({});
  };
  const [weekDayRoutesRecord, setWeekDayRoutesRecord] = React.useState(
    weekDayRoutesModelProp
  );
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? (
            await API.graphql({
              query: getWeekDayRoutes.replaceAll("__typename", ""),
              variables: { id: idProp },
            })
          )?.data?.getWeekDayRoutes
        : weekDayRoutesModelProp;
      setWeekDayRoutesRecord(record);
    };
    queryData();
  }, [idProp, weekDayRoutesModelProp]);
  React.useEffect(resetStateValues, [weekDayRoutesRecord]);
  const validations = {
    date: [],
    weekDay: [],
    vanID: [],
    kidID: [],
    Order: [],
    kidName: [],
    kidDropOffAddress: [],
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
          date: date ?? null,
          weekDay: weekDay ?? null,
          vanID: vanID ?? null,
          kidID: kidID ?? null,
          Order: Order ?? null,
          kidName: kidName ?? null,
          kidDropOffAddress: kidDropOffAddress ?? null,
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
            query: updateWeekDayRoutes.replaceAll("__typename", ""),
            variables: {
              input: {
                id: weekDayRoutesRecord.id,
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
      {...getOverrideProps(overrides, "WeekDayRoutesUpdateForm")}
      {...rest}
    >
      <TextField
        label="Date"
        isRequired={false}
        isReadOnly={false}
        type="date"
        value={date}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              date: value,
              weekDay,
              vanID,
              kidID,
              Order,
              kidName,
              kidDropOffAddress,
            };
            const result = onChange(modelFields);
            value = result?.date ?? value;
          }
          if (errors.date?.hasError) {
            runValidationTasks("date", value);
          }
          setDate(value);
        }}
        onBlur={() => runValidationTasks("date", date)}
        errorMessage={errors.date?.errorMessage}
        hasError={errors.date?.hasError}
        {...getOverrideProps(overrides, "date")}
      ></TextField>
      <TextField
        label="Week day"
        isRequired={false}
        isReadOnly={false}
        value={weekDay}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              date,
              weekDay: value,
              vanID,
              kidID,
              Order,
              kidName,
              kidDropOffAddress,
            };
            const result = onChange(modelFields);
            value = result?.weekDay ?? value;
          }
          if (errors.weekDay?.hasError) {
            runValidationTasks("weekDay", value);
          }
          setWeekDay(value);
        }}
        onBlur={() => runValidationTasks("weekDay", weekDay)}
        errorMessage={errors.weekDay?.errorMessage}
        hasError={errors.weekDay?.hasError}
        {...getOverrideProps(overrides, "weekDay")}
      ></TextField>
      <TextField
        label="Van id"
        isRequired={false}
        isReadOnly={false}
        value={vanID}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              date,
              weekDay,
              vanID: value,
              kidID,
              Order,
              kidName,
              kidDropOffAddress,
            };
            const result = onChange(modelFields);
            value = result?.vanID ?? value;
          }
          if (errors.vanID?.hasError) {
            runValidationTasks("vanID", value);
          }
          setVanID(value);
        }}
        onBlur={() => runValidationTasks("vanID", vanID)}
        errorMessage={errors.vanID?.errorMessage}
        hasError={errors.vanID?.hasError}
        {...getOverrideProps(overrides, "vanID")}
      ></TextField>
      <TextField
        label="Kid id"
        isRequired={false}
        isReadOnly={false}
        value={kidID}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              date,
              weekDay,
              vanID,
              kidID: value,
              Order,
              kidName,
              kidDropOffAddress,
            };
            const result = onChange(modelFields);
            value = result?.kidID ?? value;
          }
          if (errors.kidID?.hasError) {
            runValidationTasks("kidID", value);
          }
          setKidID(value);
        }}
        onBlur={() => runValidationTasks("kidID", kidID)}
        errorMessage={errors.kidID?.errorMessage}
        hasError={errors.kidID?.hasError}
        {...getOverrideProps(overrides, "kidID")}
      ></TextField>
      <TextField
        label="Order"
        isRequired={false}
        isReadOnly={false}
        value={Order}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              date,
              weekDay,
              vanID,
              kidID,
              Order: value,
              kidName,
              kidDropOffAddress,
            };
            const result = onChange(modelFields);
            value = result?.Order ?? value;
          }
          if (errors.Order?.hasError) {
            runValidationTasks("Order", value);
          }
          setOrder(value);
        }}
        onBlur={() => runValidationTasks("Order", Order)}
        errorMessage={errors.Order?.errorMessage}
        hasError={errors.Order?.hasError}
        {...getOverrideProps(overrides, "Order")}
      ></TextField>
      <TextField
        label="Kid name"
        isRequired={false}
        isReadOnly={false}
        value={kidName}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              date,
              weekDay,
              vanID,
              kidID,
              Order,
              kidName: value,
              kidDropOffAddress,
            };
            const result = onChange(modelFields);
            value = result?.kidName ?? value;
          }
          if (errors.kidName?.hasError) {
            runValidationTasks("kidName", value);
          }
          setKidName(value);
        }}
        onBlur={() => runValidationTasks("kidName", kidName)}
        errorMessage={errors.kidName?.errorMessage}
        hasError={errors.kidName?.hasError}
        {...getOverrideProps(overrides, "kidName")}
      ></TextField>
      <TextField
        label="Kid drop off address"
        isRequired={false}
        isReadOnly={false}
        value={kidDropOffAddress}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              date,
              weekDay,
              vanID,
              kidID,
              Order,
              kidName,
              kidDropOffAddress: value,
            };
            const result = onChange(modelFields);
            value = result?.kidDropOffAddress ?? value;
          }
          if (errors.kidDropOffAddress?.hasError) {
            runValidationTasks("kidDropOffAddress", value);
          }
          setKidDropOffAddress(value);
        }}
        onBlur={() =>
          runValidationTasks("kidDropOffAddress", kidDropOffAddress)
        }
        errorMessage={errors.kidDropOffAddress?.errorMessage}
        hasError={errors.kidDropOffAddress?.hasError}
        {...getOverrideProps(overrides, "kidDropOffAddress")}
      ></TextField>
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
          isDisabled={!(idProp || weekDayRoutesModelProp)}
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
              !(idProp || weekDayRoutesModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
