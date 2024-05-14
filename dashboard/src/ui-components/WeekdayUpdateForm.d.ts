/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
import { EscapeHatchProps } from "@aws-amplify/ui-react/internal";
import { Weekday } from "../models";
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type WeekdayUpdateFormInputValues = {
    name?: string;
};
export declare type WeekdayUpdateFormValidationValues = {
    name?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type WeekdayUpdateFormOverridesProps = {
    WeekdayUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    name?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type WeekdayUpdateFormProps = React.PropsWithChildren<{
    overrides?: WeekdayUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    weekday?: Weekday;
    onSubmit?: (fields: WeekdayUpdateFormInputValues) => WeekdayUpdateFormInputValues;
    onSuccess?: (fields: WeekdayUpdateFormInputValues) => void;
    onError?: (fields: WeekdayUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: WeekdayUpdateFormInputValues) => WeekdayUpdateFormInputValues;
    onValidate?: WeekdayUpdateFormValidationValues;
} & React.CSSProperties>;
export default function WeekdayUpdateForm(props: WeekdayUpdateFormProps): React.ReactElement;
