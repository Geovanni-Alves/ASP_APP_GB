/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import {
  Button,
  Flex,
  Grid,
  SwitchField,
  TextField,
} from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { API } from "aws-amplify";
import { getMessage } from "../graphql/queries";
import { updateMessage } from "../graphql/mutations";
export default function MessageUpdateForm(props) {
  const {
    id: idProp,
    message: messageModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    senderID: "",
    receiverIDs: "",
    content: "",
    sentAt: "",
    isRead: false,
  };
  const [senderID, setSenderID] = React.useState(initialValues.senderID);
  const [receiverIDs, setReceiverIDs] = React.useState(
    initialValues.receiverIDs
  );
  const [content, setContent] = React.useState(initialValues.content);
  const [sentAt, setSentAt] = React.useState(initialValues.sentAt);
  const [isRead, setIsRead] = React.useState(initialValues.isRead);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = messageRecord
      ? { ...initialValues, ...messageRecord }
      : initialValues;
    setSenderID(cleanValues.senderID);
    setReceiverIDs(cleanValues.receiverIDs);
    setContent(cleanValues.content);
    setSentAt(cleanValues.sentAt);
    setIsRead(cleanValues.isRead);
    setErrors({});
  };
  const [messageRecord, setMessageRecord] = React.useState(messageModelProp);
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? (
            await API.graphql({
              query: getMessage.replaceAll("__typename", ""),
              variables: { id: idProp },
            })
          )?.data?.getMessage
        : messageModelProp;
      setMessageRecord(record);
    };
    queryData();
  }, [idProp, messageModelProp]);
  React.useEffect(resetStateValues, [messageRecord]);
  const validations = {
    senderID: [{ type: "Required" }],
    receiverIDs: [{ type: "Required" }],
    content: [{ type: "Required" }],
    sentAt: [{ type: "Required" }],
    isRead: [],
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
  const convertToLocal = (date) => {
    const df = new Intl.DateTimeFormat("default", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      calendar: "iso8601",
      numberingSystem: "latn",
      hourCycle: "h23",
    });
    const parts = df.formatToParts(date).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
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
          senderID,
          receiverIDs,
          content,
          sentAt,
          isRead: isRead ?? null,
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
            query: updateMessage.replaceAll("__typename", ""),
            variables: {
              input: {
                id: messageRecord.id,
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
      {...getOverrideProps(overrides, "MessageUpdateForm")}
      {...rest}
    >
      <TextField
        label="Sender id"
        isRequired={true}
        isReadOnly={false}
        value={senderID}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              senderID: value,
              receiverIDs,
              content,
              sentAt,
              isRead,
            };
            const result = onChange(modelFields);
            value = result?.senderID ?? value;
          }
          if (errors.senderID?.hasError) {
            runValidationTasks("senderID", value);
          }
          setSenderID(value);
        }}
        onBlur={() => runValidationTasks("senderID", senderID)}
        errorMessage={errors.senderID?.errorMessage}
        hasError={errors.senderID?.hasError}
        {...getOverrideProps(overrides, "senderID")}
      ></TextField>
      <TextField
        label="Receiver i ds"
        isRequired={true}
        isReadOnly={false}
        value={receiverIDs}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              senderID,
              receiverIDs: value,
              content,
              sentAt,
              isRead,
            };
            const result = onChange(modelFields);
            value = result?.receiverIDs ?? value;
          }
          if (errors.receiverIDs?.hasError) {
            runValidationTasks("receiverIDs", value);
          }
          setReceiverIDs(value);
        }}
        onBlur={() => runValidationTasks("receiverIDs", receiverIDs)}
        errorMessage={errors.receiverIDs?.errorMessage}
        hasError={errors.receiverIDs?.hasError}
        {...getOverrideProps(overrides, "receiverIDs")}
      ></TextField>
      <TextField
        label="Content"
        isRequired={true}
        isReadOnly={false}
        value={content}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              senderID,
              receiverIDs,
              content: value,
              sentAt,
              isRead,
            };
            const result = onChange(modelFields);
            value = result?.content ?? value;
          }
          if (errors.content?.hasError) {
            runValidationTasks("content", value);
          }
          setContent(value);
        }}
        onBlur={() => runValidationTasks("content", content)}
        errorMessage={errors.content?.errorMessage}
        hasError={errors.content?.hasError}
        {...getOverrideProps(overrides, "content")}
      ></TextField>
      <TextField
        label="Sent at"
        isRequired={true}
        isReadOnly={false}
        type="datetime-local"
        value={sentAt && convertToLocal(new Date(sentAt))}
        onChange={(e) => {
          let value =
            e.target.value === "" ? "" : new Date(e.target.value).toISOString();
          if (onChange) {
            const modelFields = {
              senderID,
              receiverIDs,
              content,
              sentAt: value,
              isRead,
            };
            const result = onChange(modelFields);
            value = result?.sentAt ?? value;
          }
          if (errors.sentAt?.hasError) {
            runValidationTasks("sentAt", value);
          }
          setSentAt(value);
        }}
        onBlur={() => runValidationTasks("sentAt", sentAt)}
        errorMessage={errors.sentAt?.errorMessage}
        hasError={errors.sentAt?.hasError}
        {...getOverrideProps(overrides, "sentAt")}
      ></TextField>
      <SwitchField
        label="Is read"
        defaultChecked={false}
        isDisabled={false}
        isChecked={isRead}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              senderID,
              receiverIDs,
              content,
              sentAt,
              isRead: value,
            };
            const result = onChange(modelFields);
            value = result?.isRead ?? value;
          }
          if (errors.isRead?.hasError) {
            runValidationTasks("isRead", value);
          }
          setIsRead(value);
        }}
        onBlur={() => runValidationTasks("isRead", isRead)}
        errorMessage={errors.isRead?.errorMessage}
        hasError={errors.isRead?.hasError}
        {...getOverrideProps(overrides, "isRead")}
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
          isDisabled={!(idProp || messageModelProp)}
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
              !(idProp || messageModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
