# evercamps diverges from EverShop

evercamps started as a fork of EverShop. We no longer keep its structure so that upstream changes can be merged. Keeping a camp booking domain inside a general webshop data model cost more than it gave back. So we are free to change or remove EverShop's core migrations, triggers, GraphQL types and admin pages when they don't fit camps. Code that looks like "upstream EverShop, don't touch" is not protected for that reason alone.
