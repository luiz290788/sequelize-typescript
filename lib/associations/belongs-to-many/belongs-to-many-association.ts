import {ModelClassGetter, Model} from '../../model';
import {AssociationOptions, Association, getThroughModel, PreparedThroughOptions} from '..';
import {BelongsToManyAssociationOptions} from './belongs-to-many-association-options';
import {PreparedBelongsToManyAssociationOptions} from './prepared-belongs-to-many-association-options';
import {ModelNotInitializedError} from '../../common/errors/ModelNotInitializedError';
import {SequelizeImpl} from '../../sequelize/shared/sequelize-impl';
import {BaseAssociation} from '../shared/base-association';

export class BelongsToManyAssociation extends BaseAssociation {

  constructor(associatedClassGetter: ModelClassGetter,
              protected options: BelongsToManyAssociationOptions) {
    super(associatedClassGetter, options);
  }

  getAssociation(): Association {
    return Association.BelongsToMany;
  }

  getSequelizeOptions(modelClass: typeof Model,
                      sequelize: SequelizeImpl): AssociationOptions {
    const options: PreparedBelongsToManyAssociationOptions = {...this.options as any};
    const associatedClass = this.getAssociatedClass();
    const throughOptions = this.getThroughOptions(modelClass, sequelize);

    options.through = throughOptions;
    options.foreignKey = this.getForeignKeyOptions(modelClass, throughOptions.model, this.options.foreignKey);
    options.otherKey = this.getForeignKeyOptions(associatedClass, throughOptions.model, this.options.otherKey);

    return options;
  }

  private getThroughOptions(modelClass: typeof Model,
                            sequelize: SequelizeImpl): PreparedThroughOptions {
    const through = this.options.through;
    const model = typeof through === 'object' ? through.model : through;
    const throughOptions: PreparedThroughOptions =
      typeof through === 'object' ? {...through} : {} as any;

    if (typeof model === 'function') {
      const throughModelClass = model();
      if (!throughModelClass.isInitialized) {
        throw new ModelNotInitializedError(throughModelClass, {
          cause: 'before association can be resolved.',
        });
      }
      throughOptions.model = throughModelClass;
    } else if (typeof model === 'string') {
      // TODO@robin: Keep using strings instead of generating a through model
      // TODO:       in order to prevent manipulating parameter "sequelize"
      if (!sequelize.throughMap[model]) {
        const throughModel = getThroughModel(model);
        sequelize.addModels([throughModel]);
        sequelize.throughMap[model] = throughModel;
      }
      throughOptions.model = sequelize.throughMap[model];
    } else {
      throw new Error(`Through model is missing for belongs to many association on ${modelClass.name}`);
    }
    return throughOptions;
  }
}
