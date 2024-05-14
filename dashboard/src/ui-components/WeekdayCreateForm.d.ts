/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
import { EscapeHatchProps } from "@aws-amplify/ui-react/internal";
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type WeekdayCreateFormInputValues = {
    name?: string;
};
export declare type WeekdayCreateFormValidationValues = {
    name?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type WeekdayCreateFormOverridesProps = {
    WeekdayCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    name?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type WeekdayCreateFormProps = React.PropsWithChildren<{
    overrides?: WeekdayCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: WeekdayCreateFormInputValues) => WeekdayCreateFormInputValues;
    onSuccess?: (fields: WeekdayCreateFormInputValues) => void;
    onError?: (fields: WeekdayCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: WeekdayCreateFormInputValues) => WeekdayCreateFormInputValues;
    onValidate?: WeekdayCreateFormValidationValues;
} & React.CSSProperties>;
export default function WeekdayCreateForm(props: WeekdayCreateFormProps): React.ReactElement;
