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
export declare type PicturesCreateFormInputValues = {
    picture?: string;
    kidID?: string;
};
export declare type PicturesCreateFormValidationValues = {
    picture?: ValidationFunction<string>;
    kidID?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type PicturesCreateFormOverridesProps = {
    PicturesCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    picture?: PrimitiveOverrideProps<TextFieldProps>;
    kidID?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type PicturesCreateFormProps = React.PropsWithChildren<{
    overrides?: PicturesCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: PicturesCreateFormInputValues) => PicturesCreateFormInputValues;
    onSuccess?: (fields: PicturesCreateFormInputValues) => void;
    onError?: (fields: PicturesCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: PicturesCreateFormInputValues) => PicturesCreateFormInputValues;
    onValidate?: PicturesCreateFormValidationValues;
} & React.CSSProperties>;
export default function PicturesCreateForm(props: PicturesCreateFormProps): React.ReactElement;
