/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, SelectFieldProps, TextAreaFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type RouteCreateFormInputValues = {
    date?: string;
    departTime?: string;
    lat?: number;
    lng?: number;
    driver?: string;
    helper?: string;
    route?: string;
    status?: string;
    currentDestination?: string;
    finishedTime?: string;
};
export declare type RouteCreateFormValidationValues = {
    date?: ValidationFunction<string>;
    departTime?: ValidationFunction<string>;
    lat?: ValidationFunction<number>;
    lng?: ValidationFunction<number>;
    driver?: ValidationFunction<string>;
    helper?: ValidationFunction<string>;
    route?: ValidationFunction<string>;
    status?: ValidationFunction<string>;
    currentDestination?: ValidationFunction<string>;
    finishedTime?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type RouteCreateFormOverridesProps = {
    RouteCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    date?: PrimitiveOverrideProps<TextFieldProps>;
    departTime?: PrimitiveOverrideProps<TextFieldProps>;
    lat?: PrimitiveOverrideProps<TextFieldProps>;
    lng?: PrimitiveOverrideProps<TextFieldProps>;
    driver?: PrimitiveOverrideProps<TextFieldProps>;
    helper?: PrimitiveOverrideProps<TextFieldProps>;
    route?: PrimitiveOverrideProps<TextAreaFieldProps>;
    status?: PrimitiveOverrideProps<SelectFieldProps>;
    currentDestination?: PrimitiveOverrideProps<TextFieldProps>;
    finishedTime?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type RouteCreateFormProps = React.PropsWithChildren<{
    overrides?: RouteCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: RouteCreateFormInputValues) => RouteCreateFormInputValues;
    onSuccess?: (fields: RouteCreateFormInputValues) => void;
    onError?: (fields: RouteCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: RouteCreateFormInputValues) => RouteCreateFormInputValues;
    onValidate?: RouteCreateFormValidationValues;
} & React.CSSProperties>;
export default function RouteCreateForm(props: RouteCreateFormProps): React.ReactElement;
