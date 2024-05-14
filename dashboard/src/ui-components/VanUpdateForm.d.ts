/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
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
export declare type VanUpdateFormInputValues = {
    name?: string;
    image?: string;
    plate?: string;
    model?: string;
    year?: string;
    seats?: string;
    bosterSeats?: string;
};
export declare type VanUpdateFormValidationValues = {
    name?: ValidationFunction<string>;
    image?: ValidationFunction<string>;
    plate?: ValidationFunction<string>;
    model?: ValidationFunction<string>;
    year?: ValidationFunction<string>;
    seats?: ValidationFunction<string>;
    bosterSeats?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type VanUpdateFormOverridesProps = {
    VanUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    name?: PrimitiveOverrideProps<TextFieldProps>;
    image?: PrimitiveOverrideProps<TextFieldProps>;
    plate?: PrimitiveOverrideProps<TextFieldProps>;
    model?: PrimitiveOverrideProps<TextFieldProps>;
    year?: PrimitiveOverrideProps<TextFieldProps>;
    seats?: PrimitiveOverrideProps<TextFieldProps>;
    bosterSeats?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type VanUpdateFormProps = React.PropsWithChildren<{
    overrides?: VanUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    van?: any;
    onSubmit?: (fields: VanUpdateFormInputValues) => VanUpdateFormInputValues;
    onSuccess?: (fields: VanUpdateFormInputValues) => void;
    onError?: (fields: VanUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: VanUpdateFormInputValues) => VanUpdateFormInputValues;
    onValidate?: VanUpdateFormValidationValues;
} & React.CSSProperties>;
export default function VanUpdateForm(props: VanUpdateFormProps): React.ReactElement;
