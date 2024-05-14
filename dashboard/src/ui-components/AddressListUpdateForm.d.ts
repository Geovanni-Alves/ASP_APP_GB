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
export declare type AddressListUpdateFormInputValues = {
    order?: number;
    latitude?: number;
    longitude?: number;
    status?: string;
};
export declare type AddressListUpdateFormValidationValues = {
    order?: ValidationFunction<number>;
    latitude?: ValidationFunction<number>;
    longitude?: ValidationFunction<number>;
    status?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type AddressListUpdateFormOverridesProps = {
    AddressListUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    order?: PrimitiveOverrideProps<TextFieldProps>;
    latitude?: PrimitiveOverrideProps<TextFieldProps>;
    longitude?: PrimitiveOverrideProps<TextFieldProps>;
    status?: PrimitiveOverrideProps<SelectFieldProps>;
} & EscapeHatchProps;
export declare type AddressListUpdateFormProps = React.PropsWithChildren<{
    overrides?: AddressListUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    addressList?: any;
    onSubmit?: (fields: AddressListUpdateFormInputValues) => AddressListUpdateFormInputValues;
    onSuccess?: (fields: AddressListUpdateFormInputValues) => void;
    onError?: (fields: AddressListUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: AddressListUpdateFormInputValues) => AddressListUpdateFormInputValues;
    onValidate?: AddressListUpdateFormValidationValues;
} & React.CSSProperties>;
export default function AddressListUpdateForm(props: AddressListUpdateFormProps): React.ReactElement;
