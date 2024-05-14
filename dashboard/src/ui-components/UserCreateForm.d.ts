/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, SelectFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
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
export declare type UserCreateFormInputValues = {
    sub?: string;
    name?: string;
    email?: string;
    unitNumber?: string;
    address?: string;
    lng?: number;
    lat?: number;
    phoneNumber?: string;
    userType?: string;
    photo?: string;
    pushToken?: string;
};
export declare type UserCreateFormValidationValues = {
    sub?: ValidationFunction<string>;
    name?: ValidationFunction<string>;
    email?: ValidationFunction<string>;
    unitNumber?: ValidationFunction<string>;
    address?: ValidationFunction<string>;
    lng?: ValidationFunction<number>;
    lat?: ValidationFunction<number>;
    phoneNumber?: ValidationFunction<string>;
    userType?: ValidationFunction<string>;
    photo?: ValidationFunction<string>;
    pushToken?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type UserCreateFormOverridesProps = {
    UserCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    sub?: PrimitiveOverrideProps<TextFieldProps>;
    name?: PrimitiveOverrideProps<TextFieldProps>;
    email?: PrimitiveOverrideProps<TextFieldProps>;
    unitNumber?: PrimitiveOverrideProps<TextFieldProps>;
    address?: PrimitiveOverrideProps<TextFieldProps>;
    lng?: PrimitiveOverrideProps<TextFieldProps>;
    lat?: PrimitiveOverrideProps<TextFieldProps>;
    phoneNumber?: PrimitiveOverrideProps<TextFieldProps>;
    userType?: PrimitiveOverrideProps<SelectFieldProps>;
    photo?: PrimitiveOverrideProps<TextFieldProps>;
    pushToken?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type UserCreateFormProps = React.PropsWithChildren<{
    overrides?: UserCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: UserCreateFormInputValues) => UserCreateFormInputValues;
    onSuccess?: (fields: UserCreateFormInputValues) => void;
    onError?: (fields: UserCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: UserCreateFormInputValues) => UserCreateFormInputValues;
    onValidate?: UserCreateFormValidationValues;
} & React.CSSProperties>;
export default function UserCreateForm(props: UserCreateFormProps): React.ReactElement;
