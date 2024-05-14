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
import { getVan } from "../graphql/queries";
import { updateVan } from "../graphql/mutations";
export default function VanUpdateForm(props) {
  const {
    id: idProp,
    van: vanModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    name: "",
    image: "",
    plate: "",
    model: "",
    year: "",
    seats: "",
    bosterSeats: "",
  };
  const [name, setName] = React.useState(initialValues.name);
  const [image, setImage] = React.useState(initialValues.image);
  const [plate, setPlate] = React.useState(initialValues.plate);
  const [model, setModel] = React.useState(initialValues.model);
  const [year, setYear] = React.useState(initialValues.year);
  const [seats, setSeats] = React.useState(initialValues.seats);
  const [bosterSeats, setBosterSeats] = React.useState(
    initialValues.bosterSeats
  );
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = vanRecord
      ? { ...initialValues, ...vanRecord }
      : initialValues;
    setName(cleanValues.name);
    setImage(cleanValues.image);
    setPlate(cleanValues.plate);
    setModel(cleanValues.model);
    setYear(cleanValues.year);
    setSeats(cleanValues.seats);
    setBosterSeats(cleanValues.bosterSeats);
    setErrors({});
  };
  const [vanRecord, setVanRecord] = React.useState(vanModelProp);
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? (
            await API.graphql({
              query: getVan.replaceAll("__typename", ""),
              variables: { id: idProp },
            })
          )?.data?.getVan
        : vanModelProp;
      setVanRecord(record);
    };
    queryData();
  }, [idProp, vanModelProp]);
  React.useEffect(resetStateValues, [vanRecord]);
  const validations = {
    name: [],
    image: [],
    plate: [],
    model: [],
    year: [],
    seats: [],
    bosterSeats: [],
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
          name: name ?? null,
          image: image ?? null,
          plate: plate ?? null,
          model: model ?? null,
          year: year ?? null,
          seats: seats ?? null,
          bosterSeats: bosterSeats ?? null,
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
            query: updateVan.replaceAll("__typename", ""),
            variables: {
              input: {
                id: vanRecord.id,
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
      {...getOverrideProps(overrides, "VanUpdateForm")}
      {...rest}
    >
      <TextField
        label="Name"
        isRequired={false}
        isReadOnly={false}
        value={name}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              name: value,
              image,
              plate,
              model,
              year,
              seats,
              bosterSeats,
            };
            const result = onChange(modelFields);
            value = result?.name ?? value;
          }
          if (errors.name?.hasError) {
            runValidationTasks("name", value);
          }
          setName(value);
        }}
        onBlur={() => runValidationTasks("name", name)}
        errorMessage={errors.name?.errorMessage}
        hasError={errors.name?.hasError}
        {...getOverrideProps(overrides, "name")}
      ></TextField>
      <TextField
        label="Image"
        isRequired={false}
        isReadOnly={false}
        value={image}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              name,
              image: value,
              plate,
              model,
              year,
              seats,
              bosterSeats,
            };
            const result = onChange(modelFields);
            value = result?.image ?? value;
          }
          if (errors.image?.hasError) {
            runValidationTasks("image", value);
          }
          setImage(value);
        }}
        onBlur={() => runValidationTasks("image", image)}
        errorMessage={errors.image?.errorMessage}
        hasError={errors.image?.hasError}
        {...getOverrideProps(overrides, "image")}
      ></TextField>
      <TextField
        label="Plate"
        isRequired={false}
        isReadOnly={false}
        value={plate}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              name,
              image,
              plate: value,
              model,
              year,
              seats,
              bosterSeats,
            };
            const result = onChange(modelFields);
            value = result?.plate ?? value;
          }
          if (errors.plate?.hasError) {
            runValidationTasks("plate", value);
          }
          setPlate(value);
        }}
        onBlur={() => runValidationTasks("plate", plate)}
        errorMessage={errors.plate?.errorMessage}
        hasError={errors.plate?.hasError}
        {...getOverrideProps(overrides, "plate")}
      ></TextField>
      <TextField
        label="Model"
        isRequired={false}
        isReadOnly={false}
        value={model}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              name,
              image,
              plate,
              model: value,
              year,
              seats,
              bosterSeats,
            };
            const result = onChange(modelFields);
            value = result?.model ?? value;
          }
          if (errors.model?.hasError) {
            runValidationTasks("model", value);
          }
          setModel(value);
        }}
        onBlur={() => runValidationTasks("model", model)}
        errorMessage={errors.model?.errorMessage}
        hasError={errors.model?.hasError}
        {...getOverrideProps(overrides, "model")}
      ></TextField>
      <TextField
        label="Year"
        isRequired={false}
        isReadOnly={false}
        value={year}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              name,
              image,
              plate,
              model,
              year: value,
              seats,
              bosterSeats,
            };
            const result = onChange(modelFields);
            value = result?.year ?? value;
          }
          if (errors.year?.hasError) {
            runValidationTasks("year", value);
          }
          setYear(value);
        }}
        onBlur={() => runValidationTasks("year", year)}
        errorMessage={errors.year?.errorMessage}
        hasError={errors.year?.hasError}
        {...getOverrideProps(overrides, "year")}
      ></TextField>
      <TextField
        label="Seats"
        isRequired={false}
        isReadOnly={false}
        value={seats}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              name,
              image,
              plate,
              model,
              year,
              seats: value,
              bosterSeats,
            };
            const result = onChange(modelFields);
            value = result?.seats ?? value;
          }
          if (errors.seats?.hasError) {
            runValidationTasks("seats", value);
          }
          setSeats(value);
        }}
        onBlur={() => runValidationTasks("seats", seats)}
        errorMessage={errors.seats?.errorMessage}
        hasError={errors.seats?.hasError}
        {...getOverrideProps(overrides, "seats")}
      ></TextField>
      <TextField
        label="Boster seats"
        isRequired={false}
        isReadOnly={false}
        value={bosterSeats}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              name,
              image,
              plate,
              model,
              year,
              seats,
              bosterSeats: value,
            };
            const result = onChange(modelFields);
            value = result?.bosterSeats ?? value;
          }
          if (errors.bosterSeats?.hasError) {
            runValidationTasks("bosterSeats", value);
          }
          setBosterSeats(value);
        }}
        onBlur={() => runValidationTasks("bosterSeats", bosterSeats)}
        errorMessage={errors.bosterSeats?.errorMessage}
        hasError={errors.bosterSeats?.hasError}
        {...getOverrideProps(overrides, "bosterSeats")}
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
          isDisabled={!(idProp || vanModelProp)}
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
              !(idProp || vanModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
