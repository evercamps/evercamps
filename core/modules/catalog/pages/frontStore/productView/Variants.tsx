import PubSub from 'pubsub-js';
import React from 'react';
import { FORM_VALIDATED } from '../../../../../lib/util/events';
import './Variants.scss';
import { useAppDispatch } from '@components/context/app';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface VariantOption {
  optionId: number;
  optionText: string;
  productId: number;
  available?: boolean;
}

interface VariantAttribute {
  attributeId: number;
  attributeCode: string;
  attributeName: string;
  attribute_name?: string;
  options: VariantOption[];
  selected?: boolean;
  selectedOption?: number | null;
}

interface VariantItemAttribute {
  attributeCode: string;
  optionId: number;
}

interface VariantItem {
  attributes: VariantItemAttribute[];
}

interface VariantGroup {
  variantAttributes: VariantAttribute[];
  items: VariantItem[];
}

interface Product {
  variantGroup?: VariantGroup | null;
}

interface PageInfo {
  url: string;
}

interface VariantsProps {
  product: {
    variantGroup?: VariantGroup | null;
  };
  pageInfo: PageInfo;
}

const processAttributes = (
  vs: VariantGroup,
  attributes: VariantAttribute[],
  currentUrl: string
): VariantAttribute[] => {
  let selectedOptions: {
    attributeCode: string;
    optionId: number;
  }[] = [];

  let newAttributes = attributes.map((attribute) => {
    const url = new URL(currentUrl);
    const params = new URLSearchParams(url.search).entries();

    const check = Array.from(params).find(
      ([key, value]) =>
        key === attribute.attributeCode &&
        attribute.options.find(
          (option) => option.optionId === Number(value)
        )
    );

    if (check) {
      const terms = [
        ...selectedOptions,
        {
          attributeCode: check[0],
          optionId: Number(check[1])
        }
      ];

      const variant = vs.items.find((item) =>
        terms.every((attr) =>
          item.attributes.some(
            (term) =>
              term.attributeCode === attr.attributeCode &&
              term.optionId === attr.optionId
          )
        )
      );

      if (variant) {
        selectedOptions.push({
          attributeCode: check[0],
          optionId: Number(check[1])
        });

        return {
          ...attribute,
          selected: true,
          selectedOption: Number(check[1])
        };
      }

      return {
        ...attribute,
        selected: false,
        selectedOption: null
      };
    }

    return {
      ...attribute,
      selected: false,
      selectedOption: null
    };
  });

  newAttributes = newAttributes.map((attribute) => {
    const options = attribute.options.map((option) => {
      const terms = selectedOptions
        .filter(
          (selected) =>
            selected.attributeCode !== attribute.attributeCode
        )
        .concat({
          attributeCode: attribute.attributeCode,
          optionId: option.optionId
        });

      const variant = vs.items.find((item) =>
        terms.every((attr) =>
          item.attributes.some(
            (term) =>
              term.attributeCode === attr.attributeCode &&
              term.optionId === attr.optionId
          )
        )
      );

      return {
        ...option,
        available: !!variant
      };
    });

    return {
      ...attribute,
      options
    };
  });

  return newAttributes;
};

export default function Variants({
  product: { variantGroup: vs },
  pageInfo: { url: currentProductUrl }
}: VariantsProps) {
  const AppContextDispatch = useAppDispatch();

  const initialAttributes = React.useMemo(
    () =>
      !vs
        ? []
        : processAttributes(
            vs,
            vs.variantAttributes,
            currentProductUrl
          ),
    [vs, currentProductUrl]
  );

  const [attributes, setAttributes] =
    React.useState<VariantAttribute[]>(initialAttributes);

  const [error, setError] = React.useState<string | null>(null);

  const attributeRef = React.useRef<VariantAttribute[]>(
    initialAttributes
  );

  const validate = (
    formId: string,
    errors: Record<string, string>
  ) => {
    if (formId !== 'productForm') {
      return true;
    }

    if (
      attributeRef.current.find(
        (a) => a.selected !== true
      )
    ) {
      errors.variants = 'Missing variant';
      setError(_('Please select variant options'));
      return false;
    }

    delete errors.variants;
    setError(null);
    return true;
  };

  React.useEffect(() => {
    const token = PubSub.subscribe(
      FORM_VALIDATED,
      (_message, data) => {
        validate(data.formId, data.errors);
      }
    );

    const handlePopState = () => {
      if (!vs) {
        return;
      }

      const newAttributes = processAttributes(
        vs,
        vs.variantAttributes,
        window.location.href
      );

      setAttributes(newAttributes);
      attributeRef.current = newAttributes;
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      PubSub.unsubscribe(token);
      window.removeEventListener(
        'popstate',
        handlePopState
      );
    };
  }, []);

  const onClick = async (
    attributeCode: string,
    optionId: number
  ) => {
    const url = new URL(window.location.href);

    url.searchParams.set('ajax', 'true');
    url.searchParams.set(attributeCode, optionId.toString());

    if (!AppContextDispatch) {
      return;
    }

    await AppContextDispatch.fetchPageData(url);

    url.searchParams.delete('ajax');

    history.pushState(null, '', url);

    dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="variant variant-container grid grid-cols-1 gap-4 mt-8">
      {attributes.map((a, i) => {
        const options = a.options.filter(
          (v, j, s) =>
            s.findIndex(
              (o) => o.optionId === v.optionId
            ) === j && v.productId
        );

        return (
          <div key={a.attributeCode}>
            <input
              name={`variant_options[${i}][attribute_id]`}
              type="hidden"
              value={a.attributeId || ''}
            />

            <input
              name={`variant_options[${i}][optionId]`}
              type="hidden"
              value={a.selectedOption || ''}
            />

            <div className="mb-2 text-textSubdued uppercase">
              <span>{a.attribute_name}</span>
            </div>

            <ul className="variant-option-list flex justify-start gap-2 flex-wrap">
              {options.map((o) => {
                let className = '';

                if (
                  a.selected &&
                  a.selectedOption === o.optionId
                ) {
                  className = 'selected';
                }

                if (o.available === false) {
                  className = 'un-available';
                }

                return (
                  <li key={o.optionId} className={className}>
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();

                        if (o.available === false) {
                          return;
                        }

                        await onClick(
                          a.attributeCode,
                          o.optionId
                        );
                      }}
                    >
                      {o.optionText}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {error && (
        <div className="variant-validate error text-critical">
          {error}
        </div>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'productPageMiddleRight',
  sortOrder: 35
};

export const query = `
query Query {
  pageInfo {
    url
  }
  product(id: getContextValue('productId')) {
    variantGroup {
      variantAttributes {
        attributeId
        attributeCode
        attributeName
        options {
          optionId
          optionText
          productId
        }
      }
      items {
        attributes {
          attributeCode
          optionId
        }
      }
    }
  }
}
`;