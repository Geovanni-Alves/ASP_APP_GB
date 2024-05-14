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
import { getPictures } from "../graphql/queries";
import { updatePictures } from "../graphql/mutations";
export default function PicturesUpdateForm(props) {
  const {
    id: idProp,
    pictures: picturesModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    picture: "",
    kidID: "",
  };
  const [picture, setPicture] = React.useState(initialValues.picture);
  const [kidID, setKidID] = React.useState(initialValues.kidID);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = picturesRecord
      ? { ...initialValues, ...picturesRecord }
      : initialValues;
    setPicture(cleanValues.picture);
    setKidID(cleanValues.kidID);
    setErrors({});
  };
  const [picturesRecord, setPicturesRecord] = React.useState(picturesModelProp);
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? (
            await API.graphql({
              query: getPictures.replaceAll("__typename", ""),
              variables: { id: idProp },
            })
          )?.data?.getPictures
        : picturesModelProp;
      setPicturesRecord(record);
    };
    queryData();
  }, [idProp, picturesModelProp]);
  React.useEffect(resetStateValues, [picturesRecord]);
  const validations = {
    picture: [],
    kidID: [],
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
          picture: picture ?? null,
          kidID: kidID ?? null,
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
            query: updatePictures.replaceAll("__typename", ""),
            variables: {
              input: {
                id: picturesRecord.id,
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
      {...getOverrideProps(overrides, "PicturesUpdateForm")}
      {...rest}
    >
      <TextField
        label="Picture"
        isRequired={false}
        isReadOnly={false}
        value={picture}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              picture: value,
              kidID,
            };
            const result = onChange(modelFields);
            value = result?.picture ?? value;
          }
          if (errors.picture?.hasError) {
            runValidationTasks("picture", value);
          }
          setPicture(value);
        }}
        onBlur={() => runValidationTasks("picture", picture)}
        errorMessage={errors.picture?.errorMessage}
        hasError={errors.picture?.hasError}
        {...getOverrideProps(overrides, "picture")}
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
              picture,
              kidID: value,
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
          isDisabled={!(idProp || picturesModelProp)}
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
              !(idProp || picturesModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
